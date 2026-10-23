//! Allowlist argumen Fastboot (hanya baca) dan parser output-nya. Tidak ada flash, erase,
//! unlock, oem, atau reboot (PRD §3, §7.5).

use crate::adb::Serial;

pub const VERSION_ARGS: &[&str] = &["--version"];
pub const DEVICES_ARGS: &[&str] = &["devices"];

/// Variabel bootloader yang boleh dibaca.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FastbootVar {
    Product,
}

impl FastbootVar {
    pub fn name(self) -> &'static str {
        match self {
            FastbootVar::Product => "product",
        }
    }
}

pub fn getvar_args(serial: &Serial, var: FastbootVar) -> [&str; 4] {
    ["-s", serial.as_str(), "getvar", var.name()]
}

/// Parser `fastboot devices`: `<serial>\tfastboot` per baris.
pub fn parse_devices(stdout: &str) -> Vec<Serial> {
    stdout
        .lines()
        .filter_map(|line| {
            let mut tokens = line.split_whitespace();
            match (tokens.next(), tokens.next()) {
                (Some(serial), Some(mode)) if mode.starts_with("fastboot") => Serial::parse(serial),
                _ => None,
            }
        })
        .collect()
}

/// `fastboot getvar` menulis hasil ke stderr: `product: a12` lalu `Finished. ...`.
pub fn parse_getvar(output: &str, var: FastbootVar) -> Option<String> {
    let prefix = format!("{}:", var.name());
    output
        .lines()
        .map(str::trim)
        .find_map(|line| line.strip_prefix(prefix.as_str()))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_devices() {
        let out = "0123456789ABCDEF\tfastboot\nZY2245ABCD     fastbootd\n\n";
        let serials: Vec<_> = parse_devices(out)
            .iter()
            .map(|s| s.as_str().to_string())
            .collect();
        assert_eq!(serials, vec!["0123456789ABCDEF", "ZY2245ABCD"]);
    }

    #[test]
    fn ignores_noise_and_invalid_serials() {
        assert!(parse_devices("").is_empty());
        assert!(parse_devices("< waiting for any device >\n").is_empty());
        assert!(parse_devices("bad;serial\tfastboot\n").is_empty());
    }

    #[test]
    fn parses_getvar_product() {
        let err = "product: a12\nFinished. Total time: 0.002s\n";
        assert_eq!(
            parse_getvar(err, FastbootVar::Product).as_deref(),
            Some("a12")
        );
        assert_eq!(
            parse_getvar("product:\nFinished.", FastbootVar::Product),
            None
        );
        assert_eq!(
            parse_getvar("FAILED (remote: unknown)", FastbootVar::Product),
            None
        );
    }

    #[test]
    fn builds_read_only_arguments() {
        let serial = Serial::parse("0123456789ABCDEF").unwrap();
        assert_eq!(
            getvar_args(&serial, FastbootVar::Product),
            ["-s", "0123456789ABCDEF", "getvar", "product"]
        );
    }
}
