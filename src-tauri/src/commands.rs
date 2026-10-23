//! Perintah IPC yang diizinkan (PRD §6). Setiap perintah spesifik dan tervalidasi; tidak ada
//! runner perintah/shell generik. Daftar ini juga dikunci lewat ACL di `build.rs`.

use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;
use tokio_util::sync::CancellationToken;

use crate::{
    device::{self, DeviceSnapshotDto},
    diagnosis::{self, DiagnosisMethod, ToolError, VerifiedTool},
    drivers::{self, DriverReport},
    links::OfficialLinkId,
    platform_tools::Tool,
    process::RunError,
    redact, AppState,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    code: &'static str,
    message: String,
}

impl CommandError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

impl From<ToolError> for CommandError {
    fn from(err: ToolError) -> Self {
        match err {
            ToolError::Run(RunError::Timeout(limit)) => Self::new(
                "timeout",
                format!("Alat tidak merespons dalam {} detik.", limit.as_secs()),
            ),
            ToolError::Run(RunError::Cancelled) => Self::new("cancelled", "Dibatalkan."),
            ToolError::Run(other) => Self::new("tool-failed", other.to_string()),
            ToolError::Failed(message) => Self::new("tool-failed", message),
        }
    }
}

impl From<RunError> for CommandError {
    fn from(err: RunError) -> Self {
        ToolError::Run(err).into()
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolInfoDto {
    path: String,
    version: String,
}

impl From<&VerifiedTool> for ToolInfoDto {
    fn from(tool: &VerifiedTool) -> Self {
        Self {
            path: redact::display_path(&tool.path),
            version: tool.version.clone(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformToolsStatus {
    adb: Option<ToolInfoDto>,
    fastboot: Option<ToolInfoDto>,
}

#[tauri::command]
pub async fn check_platform_tools() -> Result<PlatformToolsStatus, CommandError> {
    let token = CancellationToken::new();
    let adb = diagnosis::verify_tool(Tool::Adb, &token).await?;
    let fastboot = diagnosis::verify_tool(Tool::Fastboot, &token).await?;
    Ok(PlatformToolsStatus {
        adb: adb.as_ref().map(Into::into),
        fastboot: fastboot.as_ref().map(Into::into),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectResult {
    devices: Vec<DeviceSnapshotDto>,
    adb_available: bool,
    fastboot_available: bool,
}

#[tauri::command]
pub async fn detect_devices(state: State<'_, AppState>) -> Result<DetectResult, CommandError> {
    let token = CancellationToken::new();
    let adb = diagnosis::verify_tool(Tool::Adb, &token).await?;
    let fastboot = diagnosis::verify_tool(Tool::Fastboot, &token).await?;
    if adb.is_none() && fastboot.is_none() {
        return Err(CommandError::new(
            "tools-missing",
            "ADB/Fastboot tidak ditemukan. Pasang Android SDK Platform-Tools resmi (halaman Tools).",
        ));
    }

    let mut devices = Vec::new();
    if let Some(adb) = &adb {
        let listing = diagnosis::list_adb(adb, &token).await?;
        for entry in &listing.entries {
            let id = state.session_id(&entry.serial);
            let props = if entry.state == crate::adb::AdbState::Device {
                Some(diagnosis::read_props(adb, &entry.serial, &token).await?)
            } else {
                None
            };
            devices.push(device::adb_snapshot(id, entry.state, props.as_ref()));
        }
    }
    if let Some(fastboot) = &fastboot {
        for serial in diagnosis::list_fastboot(fastboot, &token).await? {
            let id = state.session_id(&serial);
            let product = diagnosis::fastboot_product(fastboot, &serial, &token).await?;
            devices.push(device::fastboot_snapshot(id, product));
        }
    }
    Ok(DetectResult {
        devices,
        adb_available: adb.is_some(),
        fastboot_available: fastboot.is_some(),
    })
}

/// `run_id` dibuat oleh UI agar event pertama dapat dicocokkan sebelum perintah ini selesai.
#[tauri::command]
pub fn start_diagnosis(
    app: AppHandle,
    state: State<'_, AppState>,
    run_id: u32,
    method: DiagnosisMethod,
) -> Result<(), CommandError> {
    let token = state
        .begin_run(run_id)
        .ok_or_else(|| CommandError::new("busy", "Diagnosis lain sedang berjalan."))?;
    tauri::async_runtime::spawn(diagnosis::run(app, run_id, method, token));
    Ok(())
}

#[tauri::command]
pub fn cancel_diagnosis(state: State<'_, AppState>, run_id: u32) -> bool {
    state.cancel_run(run_id)
}

#[tauri::command]
pub async fn check_driver_status() -> Result<DriverReport, CommandError> {
    let entries = tauri::async_runtime::spawn_blocking(drivers::scan)
        .await
        .map_err(|_| CommandError::new("driver-scan-failed", "Pemeriksaan driver terhenti."))?
        .map_err(|message| CommandError::new("driver-scan-failed", message))?;
    Ok(drivers::summarize(entries))
}

#[tauri::command]
pub fn open_official_link(app: AppHandle, link: OfficialLinkId) -> Result<(), CommandError> {
    app.opener()
        .open_url(link.url(), None::<&str>)
        .map_err(|_| CommandError::new("open-failed", "Browser default tidak dapat dibuka."))
}
