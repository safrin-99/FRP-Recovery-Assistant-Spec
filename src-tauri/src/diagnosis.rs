//! Langkah diagnosis yang memakai adb/fastboot, plus jalannya diagnosis bertahap dengan
//! event progress/log ke UI. Hanya membaca status; tidak ada operasi yang mengubah perangkat.

use std::{path::PathBuf, time::Duration};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio_util::sync::CancellationToken;

use crate::{
    adb::{self, AdbEntry, AdbState, DeviceProp, Serial},
    device::{self, DeviceProps, DeviceSnapshotDto},
    fastboot::{self, FastbootVar},
    platform_tools::{self, Tool},
    process::{run_tool, RunError},
    redact, AppState,
};

pub const EVENT_NAME: &str = "diagnostic-event";

const VERSION_TIMEOUT: Duration = Duration::from_secs(10);
/// Panggilan pertama dapat menyalakan server ADB (beberapa detik).
const DEVICES_TIMEOUT: Duration = Duration::from_secs(20);
const PROP_TIMEOUT: Duration = Duration::from_secs(5);
const GETVAR_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone)]
pub struct VerifiedTool {
    pub path: PathBuf,
    pub version: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ToolError {
    #[error(transparent)]
    Run(#[from] RunError),
    #[error("{0}")]
    Failed(String),
}

/// Cari alat di semua lokasi kandidat dan pakai yang pertama lolos verifikasi `version`.
pub async fn verify_tool(
    tool: Tool,
    cancel: &CancellationToken,
) -> Result<Option<VerifiedTool>, RunError> {
    let dirs = platform_tools::candidate_dirs();
    for path in platform_tools::candidates(tool, &dirs) {
        let args = match tool {
            Tool::Adb => adb::VERSION_ARGS,
            Tool::Fastboot => fastboot::VERSION_ARGS,
        };
        match run_tool(&path, args, VERSION_TIMEOUT, cancel).await {
            Ok(out) => {
                let version = match tool {
                    Tool::Adb => platform_tools::parse_adb_version(&out.stdout),
                    Tool::Fastboot => platform_tools::parse_fastboot_version(&out.stdout),
                };
                if let Some(version) = version {
                    return Ok(Some(VerifiedTool { path, version }));
                }
            }
            Err(RunError::Cancelled) => return Err(RunError::Cancelled),
            Err(_) => continue,
        }
    }
    Ok(None)
}

fn first_line(text: &str) -> String {
    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or("tanpa pesan")
        .to_string()
}

pub struct AdbListing {
    pub entries: Vec<AdbEntry>,
    pub server_started: bool,
}

pub async fn list_adb(
    adb: &VerifiedTool,
    cancel: &CancellationToken,
) -> Result<AdbListing, ToolError> {
    let out = run_tool(&adb.path, adb::DEVICES_ARGS, DEVICES_TIMEOUT, cancel).await?;
    if out.truncated {
        // Daftar perangkat sebesar ini tidak wajar; jangan menampilkan daftar yang terpotong.
        return Err(ToolError::Failed(
            "Output adb melebihi batas ukuran.".into(),
        ));
    }
    if !out.success() && !out.stdout.contains("List of devices attached") {
        return Err(ToolError::Failed(first_line(&out.stderr)));
    }
    Ok(AdbListing {
        server_started: adb::server_started(&out.stdout, &out.stderr),
        entries: adb::parse_devices(&out.stdout),
    })
}

pub async fn read_props(
    adb: &VerifiedTool,
    serial: &Serial,
    cancel: &CancellationToken,
) -> Result<DeviceProps, RunError> {
    let mut props = DeviceProps::default();
    for prop in DeviceProp::ALL {
        let out = run_tool(
            &adb.path,
            &adb::getprop_args(serial, prop),
            PROP_TIMEOUT,
            cancel,
        )
        .await?;
        if out.success() {
            props.set(prop, device::sanitize_text(&out.stdout));
        }
    }
    Ok(props)
}

pub async fn list_fastboot(
    fastboot: &VerifiedTool,
    cancel: &CancellationToken,
) -> Result<Vec<Serial>, ToolError> {
    let out = run_tool(
        &fastboot.path,
        fastboot::DEVICES_ARGS,
        DEVICES_TIMEOUT,
        cancel,
    )
    .await?;
    if !out.success() {
        return Err(ToolError::Failed(first_line(&out.stderr)));
    }
    Ok(fastboot::parse_devices(&out.stdout))
}

pub async fn fastboot_product(
    fastboot: &VerifiedTool,
    serial: &Serial,
    cancel: &CancellationToken,
) -> Result<Option<String>, RunError> {
    let out = run_tool(
        &fastboot.path,
        &fastboot::getvar_args(serial, FastbootVar::Product),
        GETVAR_TIMEOUT,
        cancel,
    )
    .await?;
    let text = format!("{}\n{}", out.stderr, out.stdout);
    Ok(fastboot::parse_getvar(&text, FastbootVar::Product).and_then(|v| device::sanitize_text(&v)))
}

/// Pilih perangkat ADB utama: yang terotorisasi lebih dulu.
pub fn primary_adb(entries: &[AdbEntry]) -> Option<&AdbEntry> {
    entries
        .iter()
        .find(|e| e.state == AdbState::Device)
        .or_else(|| entries.first())
}

// ---------------------------------------------------------------------------
// Diagnosis bertahap
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DiagnosisMethod {
    AdbDiagnostics,
    FastbootGuide,
}

#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum DiagnosticEvent {
    Stage {
        run_id: u32,
        index: u8,
        count: u8,
        label: &'static str,
    },
    Progress {
        run_id: u32,
        percent: u8,
    },
    Log {
        run_id: u32,
        level: &'static str,
        category: &'static str,
        message: String,
    },
    Device {
        run_id: u32,
        device: DeviceSnapshotDto,
    },
    Finished {
        run_id: u32,
        outcome: &'static str,
        summary: String,
    },
    Cancelled {
        run_id: u32,
    },
    Failed {
        run_id: u32,
        message: String,
    },
}

struct Reporter {
    app: AppHandle,
    run_id: u32,
    count: u8,
}

impl Reporter {
    fn emit(&self, event: DiagnosticEvent) {
        let _ = self.app.emit(EVENT_NAME, event);
    }

    fn stage(&self, index: u8, label: &'static str) {
        self.emit(DiagnosticEvent::Stage {
            run_id: self.run_id,
            index,
            count: self.count,
            label,
        });
    }

    fn done(&self, index: u8) {
        let percent = (u16::from(index) + 1) * 100 / u16::from(self.count);
        self.emit(DiagnosticEvent::Progress {
            run_id: self.run_id,
            percent: percent as u8,
        });
    }

    fn log(&self, level: &'static str, category: &'static str, message: impl Into<String>) {
        let message = redact::redact(&message.into(), &self.serials());
        self.emit(DiagnosticEvent::Log {
            run_id: self.run_id,
            level,
            category,
            message,
        });
    }

    fn device(&self, device: DeviceSnapshotDto) {
        self.emit(DiagnosticEvent::Device {
            run_id: self.run_id,
            device,
        });
    }

    fn finish(&self, outcome: &'static str, summary: impl Into<String>) {
        self.emit(DiagnosticEvent::Progress {
            run_id: self.run_id,
            percent: 100,
        });
        let summary = redact::redact(&summary.into(), &self.serials());
        self.emit(DiagnosticEvent::Finished {
            run_id: self.run_id,
            outcome,
            summary,
        });
    }

    fn fail(&self, message: impl Into<String>) {
        let message = redact::redact(&message.into(), &self.serials());
        self.emit(DiagnosticEvent::Failed {
            run_id: self.run_id,
            message,
        });
    }

    fn serials(&self) -> Vec<String> {
        self.app.state::<AppState>().known_serials()
    }

    fn session_id(&self, serial: &Serial) -> String {
        self.app.state::<AppState>().session_id(serial)
    }
}

const ADB_STAGES: [&str; 5] = [
    "Memeriksa Android Platform-Tools",
    "Mendeteksi perangkat (ADB)",
    "Memeriksa otorisasi USB debugging",
    "Membaca informasi perangkat",
    "Menyusun ringkasan",
];

const FASTBOOT_STAGES: [&str; 4] = [
    "Memeriksa Android Platform-Tools",
    "Mendeteksi perangkat (Fastboot)",
    "Membaca info bootloader",
    "Menyusun ringkasan",
];

/// Menjalankan diagnosis lalu melaporkan hasil akhir (selesai, batal, atau gagal).
pub async fn run(app: AppHandle, run_id: u32, method: DiagnosisMethod, cancel: CancellationToken) {
    let count = match method {
        DiagnosisMethod::AdbDiagnostics => ADB_STAGES.len(),
        DiagnosisMethod::FastbootGuide => FASTBOOT_STAGES.len(),
    } as u8;
    let reporter = Reporter {
        app: app.clone(),
        run_id,
        count,
    };
    let result = match method {
        DiagnosisMethod::AdbDiagnostics => run_adb(&reporter, &cancel).await,
        DiagnosisMethod::FastbootGuide => run_fastboot(&reporter, &cancel).await,
    };
    match result {
        Ok(()) => {}
        Err(ToolError::Run(RunError::Cancelled)) => {
            reporter.emit(DiagnosticEvent::Cancelled { run_id })
        }
        Err(ToolError::Run(RunError::Timeout(limit))) => reporter.fail(format!(
            "Alat tidak merespons dalam {} detik. Cabut-pasang kabel lalu coba lagi.",
            limit.as_secs()
        )),
        Err(err) => reporter.fail(format!("Diagnosis gagal: {err}")),
    }
    app.state::<AppState>().clear_run(run_id);
}

async fn require_tool(
    reporter: &Reporter,
    tool: Tool,
    cancel: &CancellationToken,
) -> Result<Option<VerifiedTool>, ToolError> {
    let (name, category) = match tool {
        Tool::Adb => ("ADB", "ADB"),
        Tool::Fastboot => ("Fastboot", "Fastboot"),
    };
    match verify_tool(tool, cancel).await? {
        Some(found) => {
            reporter.log(
                "success",
                category,
                // Path lengkap (tersamar) ada di halaman Tools; log cukup versi.
                format!("{name} {} ditemukan.", found.version),
            );
            Ok(Some(found))
        }
        None => {
            reporter.log("error", category, format!("{name} tidak ditemukan."));
            reporter.finish(
                "error",
                format!("{name} tidak ditemukan. Pasang Android SDK Platform-Tools resmi (halaman Tools), lalu coba lagi."),
            );
            Ok(None)
        }
    }
}

async fn run_adb(r: &Reporter, cancel: &CancellationToken) -> Result<(), ToolError> {
    r.stage(0, ADB_STAGES[0]);
    let Some(adb) = require_tool(r, Tool::Adb, cancel).await? else {
        return Ok(());
    };
    r.done(0);

    r.stage(1, ADB_STAGES[1]);
    let listing = list_adb(&adb, cancel).await?;
    if listing.server_started {
        r.log("info", "ADB", "Server ADB lokal dinyalakan (localhost).");
    }
    let Some(primary) = primary_adb(&listing.entries).cloned() else {
        r.log(
            "warning",
            "Perangkat",
            "Tidak ada perangkat ADB terdeteksi.",
        );
        r.finish(
            "warning",
            "Tidak ada perangkat ADB. Pastikan kabel data terhubung, USB debugging aktif, dan driver terpasang (halaman Drivers).",
        );
        return Ok(());
    };
    if listing.entries.len() > 1 {
        r.log(
            "info",
            "Perangkat",
            format!(
                "{} perangkat terdeteksi; diagnosis memakai satu perangkat.",
                listing.entries.len()
            ),
        );
    }
    let id = r.session_id(&primary.serial);
    r.done(1);

    r.stage(2, ADB_STAGES[2]);
    match primary.state {
        AdbState::Device => r.log("success", "USB", "USB debugging terotorisasi."),
        AdbState::Recovery | AdbState::Sideload | AdbState::Rescue => r.log(
            "info",
            "Perangkat",
            "Perangkat dalam mode recovery/sideload; info sistem mungkin terbatas.",
        ),
        AdbState::Unauthorized => {
            r.device(device::adb_snapshot(id, primary.state, None));
            r.log(
                "warning",
                "USB",
                "Perangkat belum mengizinkan komputer ini.",
            );
            r.finish(
                "warning",
                "Perangkat belum diotorisasi. Buka kunci layar dan setujui dialog \"Allow USB debugging\", lalu jalankan diagnosis lagi.",
            );
            return Ok(());
        }
        AdbState::Offline => {
            r.device(device::adb_snapshot(id, primary.state, None));
            r.log("warning", "USB", "Perangkat terdeteksi tetapi offline.");
            r.finish(
                "warning",
                "Perangkat offline. Cabut-pasang kabel atau ganti port USB, lalu coba lagi.",
            );
            return Ok(());
        }
        _ => {
            r.device(device::adb_snapshot(id, primary.state, None));
            r.log("warning", "USB", "Status koneksi perangkat belum siap.");
            r.finish(
                "warning",
                "Status koneksi belum siap. Tunggu beberapa detik lalu coba lagi.",
            );
            return Ok(());
        }
    }
    r.done(2);

    r.stage(3, ADB_STAGES[3]);
    let props = read_props(&adb, &primary.serial, cancel).await?;
    if props.is_empty() {
        r.log(
            "warning",
            "Perangkat",
            "Info perangkat tidak dapat dibaca melalui koneksi ini.",
        );
    } else {
        r.log(
            "success",
            "Perangkat",
            format!("Info perangkat terbaca: {}.", props.label()),
        );
    }
    r.log(
        "info",
        "Sistem",
        "Status FRP tidak dapat diverifikasi melalui ADB dan tidak dibaca.",
    );
    r.device(device::adb_snapshot(id, primary.state, Some(&props)));
    r.done(3);

    r.stage(4, ADB_STAGES[4]);
    let version = props.android_version.as_deref().unwrap_or("—");
    let patch = props.security_patch.as_deref().unwrap_or("—");
    r.finish(
        "ok",
        format!(
            "Koneksi ADB normal: {} terotorisasi, Android {version}, patch keamanan {patch}.",
            props.label()
        ),
    );
    Ok(())
}

async fn run_fastboot(r: &Reporter, cancel: &CancellationToken) -> Result<(), ToolError> {
    r.stage(0, FASTBOOT_STAGES[0]);
    let Some(fastboot) = require_tool(r, Tool::Fastboot, cancel).await? else {
        return Ok(());
    };
    r.done(0);

    r.stage(1, FASTBOOT_STAGES[1]);
    let serials = list_fastboot(&fastboot, cancel).await?;
    let Some(serial) = serials.first().cloned() else {
        r.log(
            "warning",
            "Fastboot",
            "Tidak ada perangkat dalam mode Fastboot.",
        );
        r.finish(
            "warning",
            "Tidak ada perangkat dalam mode Fastboot. Cara masuk mode bootloader berbeda tiap merek; ikuti panduan resmi produsen.",
        );
        return Ok(());
    };
    let id = r.session_id(&serial);
    r.log(
        "success",
        "Fastboot",
        "Perangkat terdeteksi dalam mode Fastboot.",
    );
    r.done(1);

    r.stage(2, FASTBOOT_STAGES[2]);
    let product = fastboot_product(&fastboot, &serial, cancel).await?;
    match &product {
        Some(product) => r.log("info", "Fastboot", format!("Produk bootloader: {product}.")),
        None => r.log(
            "warning",
            "Fastboot",
            "Info produk tidak tersedia dari bootloader.",
        ),
    }
    r.device(device::fastboot_snapshot(id, product));
    r.done(2);

    r.stage(3, FASTBOOT_STAGES[3]);
    r.finish(
        "ok",
        "Perangkat terdeteksi di mode Fastboot. Aplikasi tidak melakukan flash, unlock, atau reset; ikuti panduan resmi produsen untuk langkah berikutnya.",
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(serial: &str, state: AdbState) -> AdbEntry {
        AdbEntry {
            serial: Serial::parse(serial).unwrap(),
            state,
        }
    }

    #[test]
    fn prefers_authorized_devices() {
        let entries = vec![
            entry("AAAA1111", AdbState::Unauthorized),
            entry("BBBB2222", AdbState::Device),
        ];
        assert_eq!(primary_adb(&entries).unwrap().serial.as_str(), "BBBB2222");
        assert_eq!(
            primary_adb(&entries[..1]).unwrap().state,
            AdbState::Unauthorized
        );
        assert!(primary_adb(&[]).is_none());
    }

    #[test]
    fn has_consistent_stage_tables() {
        assert_eq!(ADB_STAGES.len(), 5);
        assert_eq!(FASTBOOT_STAGES.len(), 4);
    }

    /// Uji asap dengan Platform-Tools asli di mesin pengembang: `cargo test -- --ignored`.
    /// Hanya membaca status (`version`, `devices`); tidak mengubah perangkat apa pun.
    #[tokio::test]
    #[ignore = "membutuhkan Android SDK Platform-Tools terpasang"]
    async fn smoke_real_platform_tools() {
        let token = CancellationToken::new();
        let adb = verify_tool(Tool::Adb, &token)
            .await
            .expect("verifikasi berjalan")
            .expect("adb terpasang");
        println!("adb {} di {}", adb.version, redact::display_path(&adb.path));
        let listing = list_adb(&adb, &token).await.expect("adb devices berjalan");
        println!(
            "adb: {} perangkat, server baru dinyalakan: {}",
            listing.entries.len(),
            listing.server_started
        );

        let fastboot = verify_tool(Tool::Fastboot, &token)
            .await
            .expect("verifikasi berjalan")
            .expect("fastboot terpasang");
        let serials = list_fastboot(&fastboot, &token)
            .await
            .expect("fastboot devices berjalan");
        println!("fastboot {}: {} perangkat", fastboot.version, serials.len());
    }

    #[cfg(windows)]
    #[test]
    #[ignore = "membaca Device Manager mesin pengembang"]
    fn smoke_real_driver_scan() {
        let entries = crate::drivers::scan().expect("SetupAPI dapat dibaca");
        let report = crate::drivers::summarize(entries);
        println!(
            "driver: {} entri, level {}: {}",
            report.entries.len(),
            report.level,
            report.summary
        );
    }
}
