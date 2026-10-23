//! FRP Recovery Assistant — shell desktop (Milestone 1).
//!
//! Belum ada perintah IPC yang didaftarkan. Layanan perangkat (Milestone 2) akan
//! ditambahkan sebagai perintah spesifik yang di-allowlist (mis. `detect_devices`),
//! tidak pernah sebagai runner perintah/shell generik (PRD §6).

use tauri::Manager;

/// Ukuran jendela acuan desain (DESIGN.md §2).
const DESIGN_WIDTH: f64 = 1536.0;
const DESIGN_HEIGHT: f64 = 1024.0;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
