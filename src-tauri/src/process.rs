//! Satu-satunya tempat proses eksternal dijalankan (PRD §6, CLAUDE.md).
//!
//! Tidak diekspos sebagai perintah IPC. `program` hanya berasal dari pencari
//! Platform-Tools, dan `args` hanya dari pembangun argumen allowlist di `adb`/`fastboot`.
//! Argumen dikirim sebagai array (tanpa shell), dengan timeout, pembatalan, batas output,
//! dan tanpa jendela konsol.

use std::{
    path::Path,
    process::{ExitStatus, Stdio},
    sync::{Arc, Mutex},
    time::Duration,
};

use tokio::{
    io::{AsyncRead, AsyncReadExt},
    process::Command,
    task::JoinHandle,
};
use tokio_util::sync::CancellationToken;

pub const MAX_OUTPUT_BYTES: usize = 256 * 1024;
/// adb dapat mewariskan pipe ke server latar belakang yang baru dinyalakan; setelah proses
/// keluar, jangan menunggu EOF tanpa batas.
const PIPE_GRACE: Duration = Duration::from_millis(500);

#[derive(Debug)]
pub struct ToolOutput {
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub truncated: bool,
}

impl ToolOutput {
    pub fn success(&self) -> bool {
        self.exit_code == Some(0)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RunError {
    #[error("gagal menjalankan alat: {0}")]
    Spawn(#[source] std::io::Error),
    #[error("melebihi batas waktu {} detik", .0.as_secs())]
    Timeout(Duration),
    #[error("dibatalkan")]
    Cancelled,
    #[error("kesalahan I/O: {0}")]
    Io(#[source] std::io::Error),
}

#[derive(Default)]
struct Captured {
    bytes: Vec<u8>,
    truncated: bool,
}

async fn drain<R: AsyncRead + Unpin>(mut reader: R, sink: Arc<Mutex<Captured>>) {
    let mut chunk = [0u8; 8192];
    loop {
        match reader.read(&mut chunk).await {
            Ok(0) | Err(_) => break,
            Ok(n) => {
                let mut captured = sink.lock().unwrap_or_else(|e| e.into_inner());
                let room = MAX_OUTPUT_BYTES.saturating_sub(captured.bytes.len());
                if n > room {
                    captured.truncated = true;
                }
                // Tetap membaca sisa output agar proses anak tidak macet karena pipe penuh.
                captured.bytes.extend_from_slice(&chunk[..n.min(room)]);
            }
        }
    }
}

async fn finish_reader(task: Option<JoinHandle<()>>) {
    if let Some(mut task) = task {
        if tokio::time::timeout(PIPE_GRACE, &mut task).await.is_err() {
            task.abort();
        }
    }
}

fn take_captured(sink: &Arc<Mutex<Captured>>) -> (String, bool) {
    let captured = sink.lock().unwrap_or_else(|e| e.into_inner());
    (
        String::from_utf8_lossy(&captured.bytes).into_owned(),
        captured.truncated,
    )
}

enum Waited {
    Exited(std::io::Result<ExitStatus>),
    TimedOut,
    Cancelled,
}

pub async fn run_tool(
    program: &Path,
    args: &[&str],
    timeout: Duration,
    cancel: &CancellationToken,
) -> Result<ToolOutput, RunError> {
    if cancel.is_cancelled() {
        return Err(RunError::Cancelled);
    }

    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command.spawn().map_err(RunError::Spawn)?;
    let out = Arc::new(Mutex::new(Captured::default()));
    let err = Arc::new(Mutex::new(Captured::default()));
    let out_task = child
        .stdout
        .take()
        .map(|pipe| tokio::spawn(drain(pipe, out.clone())));
    let err_task = child
        .stderr
        .take()
        .map(|pipe| tokio::spawn(drain(pipe, err.clone())));

    let waited = tokio::select! {
        biased;
        () = cancel.cancelled() => Waited::Cancelled,
        result = tokio::time::timeout(timeout, child.wait()) => match result {
            Ok(status) => Waited::Exited(status),
            Err(_) => Waited::TimedOut,
        },
    };

    let status = match waited {
        Waited::Exited(status) => status.map_err(RunError::Io)?,
        Waited::TimedOut | Waited::Cancelled => {
            let _ = child.start_kill();
            for task in [out_task, err_task].into_iter().flatten() {
                task.abort();
            }
            return Err(match waited {
                Waited::TimedOut => RunError::Timeout(timeout),
                _ => RunError::Cancelled,
            });
        }
    };

    finish_reader(out_task).await;
    finish_reader(err_task).await;
    let (stdout, out_truncated) = take_captured(&out);
    let (stderr, err_truncated) = take_captured(&err);

    Ok(ToolOutput {
        exit_code: status.code(),
        stdout,
        stderr,
        truncated: out_truncated || err_truncated,
    })
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn cmd_exe() -> PathBuf {
        let root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
        PathBuf::from(root).join("System32").join("cmd.exe")
    }

    #[tokio::test]
    async fn captures_stdout_and_exit_code() {
        let token = CancellationToken::new();
        let out = run_tool(
            &cmd_exe(),
            &["/C", "echo halo"],
            Duration::from_secs(10),
            &token,
        )
        .await
        .expect("cmd berjalan");
        assert!(out.success());
        assert_eq!(out.stdout.trim(), "halo");
        assert!(!out.truncated);
    }

    #[tokio::test]
    async fn reports_non_zero_exit_codes() {
        let token = CancellationToken::new();
        let out = run_tool(
            &cmd_exe(),
            &["/C", "exit 3"],
            Duration::from_secs(10),
            &token,
        )
        .await
        .expect("cmd berjalan");
        assert_eq!(out.exit_code, Some(3));
    }

    #[tokio::test]
    async fn times_out_long_running_processes() {
        let token = CancellationToken::new();
        let result = run_tool(
            &cmd_exe(),
            &["/C", "ping -n 30 127.0.0.1 >NUL"],
            Duration::from_millis(300),
            &token,
        )
        .await;
        assert!(matches!(result, Err(RunError::Timeout(_))));
    }

    #[tokio::test]
    async fn cancels_running_processes() {
        let token = CancellationToken::new();
        let canceller = token.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(200)).await;
            canceller.cancel();
        });
        let result = run_tool(
            &cmd_exe(),
            &["/C", "ping -n 30 127.0.0.1 >NUL"],
            Duration::from_secs(30),
            &token,
        )
        .await;
        assert!(matches!(result, Err(RunError::Cancelled)));
    }

    #[tokio::test]
    async fn reports_missing_programs_as_spawn_errors() {
        let token = CancellationToken::new();
        let result = run_tool(
            Path::new(r"C:\tidak-ada\adb.exe"),
            &["version"],
            Duration::from_secs(5),
            &token,
        )
        .await;
        assert!(matches!(result, Err(RunError::Spawn(_))));
    }
}
