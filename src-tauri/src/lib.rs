//! FRP Recovery Assistant — backend desktop.
//!
//! Milestone 2: diagnosis ADB/Fastboot yang hanya membaca status, lewat perintah IPC
//! spesifik di `commands`. Tidak ada runner perintah/shell generik (PRD §6) dan tidak ada
//! operasi destruktif (flash, unlock, reset, wipe).

mod adb;
mod commands;
mod device;
mod diagnosis;
mod drivers;
mod fastboot;
mod links;
mod platform_tools;
mod process;
mod redact;

use std::sync::Mutex;

use tauri::Manager;
use tokio_util::sync::CancellationToken;

/// Ukuran jendela acuan desain (DESIGN.md §2).
const DESIGN_WIDTH: f64 = 1536.0;
const DESIGN_HEIGHT: f64 = 1024.0;

/// State bersama antarperintah. Mutex tidak pernah ditahan melewati `.await`.
#[derive(Default)]
pub struct AppState {
    devices: Mutex<device::DeviceRegistry>,
    active_run: Mutex<Option<(u32, CancellationToken)>>,
}

impl AppState {
    fn session_id(&self, serial: &adb::Serial) -> String {
        self.devices
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .id_for(serial)
    }

    fn known_serials(&self) -> Vec<String> {
        self.devices
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .known_serials()
    }

    /// Mulai run baru bila tidak ada run lain yang berjalan.
    fn begin_run(&self, run_id: u32) -> Option<CancellationToken> {
        let mut active = self.active_run.lock().unwrap_or_else(|e| e.into_inner());
        if active.is_some() {
            return None;
        }
        let token = CancellationToken::new();
        *active = Some((run_id, token.clone()));
        Some(token)
    }

    fn cancel_run(&self, run_id: u32) -> bool {
        let active = self.active_run.lock().unwrap_or_else(|e| e.into_inner());
        match active.as_ref() {
            Some((id, token)) if *id == run_id => {
                token.cancel();
                true
            }
            _ => false,
        }
    }

    fn clear_run(&self, run_id: u32) {
        let mut active = self.active_run.lock().unwrap_or_else(|e| e.into_inner());
        if matches!(active.as_ref(), Some((id, _)) if *id == run_id) {
            *active = None;
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Hanya API Rust yang dipakai (open_official_link); tidak ada skrip injeksi atau izin JS.
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::check_platform_tools,
            commands::detect_devices,
            commands::start_diagnosis,
            commands::cancel_diagnosis,
            commands::check_driver_status,
            commands::open_official_link,
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                fit_to_monitor(&window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("gagal menjalankan FRP Recovery Assistant");
}

/// Pada layar yang lebih kecil dari ukuran acuan (mis. 1920×1080 @150% = 1280×720
/// logis), jendela dimaksimalkan agar tidak melebihi monitor.
fn fit_to_monitor(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };
    let available = monitor.size().to_logical::<f64>(monitor.scale_factor());
    if available.width < DESIGN_WIDTH || available.height < DESIGN_HEIGHT {
        let _ = window.maximize();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_only_one_run_at_a_time() {
        let state = AppState::default();
        let token = state.begin_run(1).expect("run pertama");
        assert!(state.begin_run(2).is_none());
        assert!(!state.cancel_run(2));
        assert!(state.cancel_run(1));
        assert!(token.is_cancelled());
        state.clear_run(1);
        assert!(state.begin_run(2).is_some());
    }

    #[test]
    fn ignores_clear_for_other_runs() {
        let state = AppState::default();
        state.begin_run(7);
        state.clear_run(8);
        assert!(state.begin_run(9).is_none());
    }
}
