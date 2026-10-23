fn main() {
    // ACL perintah aplikasi: setiap perintah harus diizinkan secara eksplisit di
    // capabilities/default.json (allow-<nama-perintah>).
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "check_platform_tools",
            "detect_devices",
            "start_diagnosis",
            "cancel_diagnosis",
            "check_driver_status",
            "open_official_link",
        ]),
    ))
    .expect("gagal menjalankan tauri-build");
}
