//! Redaksi teks sebelum dikirim ke UI atau log (PRD §6): serial perangkat dan path
//! profil pengguna tidak boleh ikut tampil.

use std::path::Path;

/// Ganti serial perangkat yang diketahui dan path profil pengguna.
pub fn redact(text: &str, serials: &[String]) -> String {
    let mut out = text.to_owned();
    for serial in serials.iter().filter(|s| s.len() >= 4) {
        out = out.replace(serial.as_str(), "[serial]");
    }
    if let Ok(home) = std::env::var("USERPROFILE") {
        if !home.is_empty() {
            out = replace_ascii_case_insensitive(&out, &home, "%USERPROFILE%");
        }
    }
    out
}

/// Path untuk ditampilkan: profil pengguna disamarkan.
pub fn display_path(path: &Path) -> String {
    redact(&path.display().to_string(), &[])
}

/// Path Windows tidak peka huruf besar/kecil. `to_ascii_lowercase` tidak mengubah panjang
/// byte, sehingga indeks hasil pencarian tetap valid pada teks asli.
fn replace_ascii_case_insensitive(haystack: &str, needle: &str, replacement: &str) -> String {
    let lower_hay = haystack.to_ascii_lowercase();
    let lower_needle = needle.to_ascii_lowercase();
    let mut out = String::with_capacity(haystack.len());
    let mut cursor = 0;
    while let Some(found) = lower_hay[cursor..].find(&lower_needle) {
        let start = cursor + found;
        out.push_str(&haystack[cursor..start]);
        out.push_str(replacement);
        cursor = start + needle.len();
    }
    out.push_str(&haystack[cursor..]);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_known_serials() {
        let serials = vec!["R58N12ABCDE".to_string()];
        assert_eq!(
            redact("adb: device 'R58N12ABCDE' not found", &serials),
            "adb: device '[serial]' not found"
        );
    }

    #[test]
    fn ignores_too_short_serials() {
        let serials = vec!["ab".to_string()];
        assert_eq!(redact("about", &serials), "about");
    }

    #[test]
    fn replaces_paths_case_insensitively() {
        assert_eq!(
            replace_ascii_case_insensitive(
                r"C:\USERS\Me\adb.exe and c:\users\me\x",
                r"C:\Users\Me",
                "%USERPROFILE%"
            ),
            r"%USERPROFILE%\adb.exe and %USERPROFILE%\x"
        );
    }
}
