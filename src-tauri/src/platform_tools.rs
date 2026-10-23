//! Pencarian Android SDK Platform-Tools resmi (PRD §5). Aplikasi tidak mengunduh atau
//! membundel binary; hanya mencari instalasi yang sudah ada lalu memverifikasinya lewat
//! output `version`.

use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tool {
    Adb,
    Fastboot,
}

impl Tool {
    pub fn file_name(self) -> &'static str {
        match (self, cfg!(windows)) {
            (Tool::Adb, true) => "adb.exe",
            (Tool::Adb, false) => "adb",
            (Tool::Fastboot, true) => "fastboot.exe",
            (Tool::Fastboot, false) => "fastboot",
        }
    }
}

/// Folder kandidat, berurutan: PATH proses, ANDROID_HOME/ANDROID_SDK_ROOT, lokasi default
/// Android Studio, lalu lokasi paket winget `Google.PlatformTools` (proses yang dibuka
/// sebelum instalasi winget belum melihat PATH barunya).
pub fn candidate_dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();
    if let Some(path) = std::env::var_os("PATH") {
        dirs.extend(std::env::split_paths(&path));
    }
    for var in ["ANDROID_HOME", "ANDROID_SDK_ROOT"] {
        if let Some(root) = std::env::var_os(var) {
            dirs.push(PathBuf::from(root).join("platform-tools"));
        }
    }
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        let local = PathBuf::from(local);
        dirs.push(local.join("Android").join("Sdk").join("platform-tools"));
        let winget = local.join("Microsoft").join("WinGet").join("Packages");
        if let Ok(entries) = std::fs::read_dir(winget) {
            for entry in entries.flatten() {
                if entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("Google.PlatformTools_")
                {
                    dirs.push(entry.path().join("platform-tools"));
                }
            }
        }
    }
    let mut seen = std::collections::HashSet::new();
    dirs.retain(|dir| seen.insert(dir.to_string_lossy().to_ascii_lowercase()));
    dirs
}

/// Semua file alat yang ada di folder kandidat, sesuai urutan prioritas.
pub fn candidates(tool: Tool, dirs: &[PathBuf]) -> Vec<PathBuf> {
    dirs.iter()
        .map(|dir| dir.join(tool.file_name()))
        .filter(|path| path.is_file())
        .collect()
}

/// `adb version` → "37.0.1-15733141". Baris pertama wajib "Android Debug Bridge version"
/// sebagai pemeriksaan identitas sederhana.
pub fn parse_adb_version(stdout: &str) -> Option<String> {
    let mut lines = stdout
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty());
    let first = lines.next()?;
    let protocol = first
        .strip_prefix("Android Debug Bridge version ")?
        .trim()
        .to_string();
    let release =
        lines.find_map(|line| line.strip_prefix("Version ").map(|v| v.trim().to_string()));
    Some(release.unwrap_or(protocol))
}

/// `fastboot --version` → "37.0.1-15733141".
pub fn parse_fastboot_version(stdout: &str) -> Option<String> {
    stdout
        .lines()
        .map(str::trim)
        .find_map(|line| line.strip_prefix("fastboot version "))
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_adb_version() {
        let out = "Android Debug Bridge version 1.0.41\r\nVersion 37.0.1-15733141\r\nInstalled as C:\\x\\adb.exe\r\nRunning on Windows 10.0.26200\r\n";
        assert_eq!(parse_adb_version(out).as_deref(), Some("37.0.1-15733141"));
    }

    #[test]
    fn falls_back_to_protocol_version() {
        assert_eq!(
            parse_adb_version("Android Debug Bridge version 1.0.39\n").as_deref(),
            Some("1.0.39")
        );
    }

    #[test]
    fn rejects_unknown_programs() {
        assert_eq!(
            parse_adb_version("Microsoft Windows [Version 10.0]\n"),
            None
        );
        assert_eq!(parse_adb_version(""), None);
        assert_eq!(parse_fastboot_version("something else"), None);
    }

    #[test]
    fn parses_fastboot_version() {
        let out = "fastboot version 37.0.1-15733141\nInstalled as C:\\x\\fastboot.exe\n";
        assert_eq!(
            parse_fastboot_version(out).as_deref(),
            Some("37.0.1-15733141")
        );
    }

    #[test]
    fn uses_platform_file_names() {
        let name = Tool::Adb.file_name();
        assert!(name == "adb.exe" || name == "adb");
    }
}
