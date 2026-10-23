//! Allowlist argumen ADB dan parser output-nya. Tidak ada argumen bebas: hanya `version`,
//! `devices -l`, dan `shell getprop <kunci tetap>` untuk serial yang sudah tervalidasi.

/// Serial perangkat yang tervalidasi. Hanya dibuat dari output `adb devices`/`fastboot
/// devices`, tidak pernah dari input UI; tidak pernah dikirim ke frontend.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Serial(String);

impl Serial {
    pub fn parse(raw: &str) -> Option<Self> {
        let valid = (1..=64).contains(&raw.len())
            && raw
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | ':' | '-'));
        valid.then(|| Serial(raw.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

pub const VERSION_ARGS: &[&str] = &["version"];
pub const DEVICES_ARGS: &[&str] = &["devices", "-l"];

/// Properti sistem yang boleh dibaca (non-sensitif). Serial/IMEI tidak termasuk.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceProp {
    Brand,
    Model,
    MarketName,
    VendorMarketName,
    AndroidRelease,
    SecurityPatch,
}

impl DeviceProp {
    pub const ALL: [DeviceProp; 6] = [
        DeviceProp::Brand,
        DeviceProp::Model,
        DeviceProp::MarketName,
        DeviceProp::VendorMarketName,
        DeviceProp::AndroidRelease,
        DeviceProp::SecurityPatch,
    ];

    pub fn key(self) -> &'static str {
        match self {
            DeviceProp::Brand => "ro.product.brand",
            DeviceProp::Model => "ro.product.model",
            DeviceProp::MarketName => "ro.product.marketname",
            DeviceProp::VendorMarketName => "ro.product.vendor.marketname",
            DeviceProp::AndroidRelease => "ro.build.version.release",
            DeviceProp::SecurityPatch => "ro.build.version.security_patch",
        }
    }
}

pub fn getprop_args(serial: &Serial, prop: DeviceProp) -> [&str; 5] {
    ["-s", serial.as_str(), "shell", "getprop", prop.key()]
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdbState {
    Device,
    Unauthorized,
    Offline,
    Recovery,
    Sideload,
    Rescue,
    Authorizing,
    Connecting,
    NoPermissions,
    Other,
}

impl AdbState {
    fn parse(token: &str) -> Self {
        match token {
            "device" => AdbState::Device,
            "unauthorized" => AdbState::Unauthorized,
            "offline" => AdbState::Offline,
            "recovery" => AdbState::Recovery,
            "sideload" => AdbState::Sideload,
            "rescue" => AdbState::Rescue,
            "authorizing" => AdbState::Authorizing,
            "connecting" => AdbState::Connecting,
            "no" => AdbState::NoPermissions,
            _ => AdbState::Other,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdbEntry {
    pub serial: Serial,
    pub state: AdbState,
}

/// Parser `adb devices -l`. Baris pesan daemon (`* daemon ...`) dan serial tidak valid dilewati.
pub fn parse_devices(stdout: &str) -> Vec<AdbEntry> {
    let mut in_list = false;
    let mut entries = Vec::new();
    for line in stdout.lines().map(str::trim) {
        if line.starts_with("List of devices attached") {
            in_list = true;
            continue;
        }
        if !in_list || line.is_empty() || line.starts_with('*') {
            continue;
        }
        let mut tokens = line.split_whitespace();
        let (Some(serial), Some(state)) = (tokens.next(), tokens.next()) else {
            continue;
        };
        if let Some(serial) = Serial::parse(serial) {
            entries.push(AdbEntry {
                serial,
                state: AdbState::parse(state),
            });
        }
    }
    entries
}

pub fn server_started(stdout: &str, stderr: &str) -> bool {
    stdout.contains("daemon started successfully") || stderr.contains("daemon started successfully")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_serials() {
        assert!(Serial::parse("R58N12ABCDE").is_some());
        assert!(Serial::parse("192.168.1.5:5555").is_some());
        assert!(Serial::parse("adb-R58N._adb-tls-connect._tcp").is_some());
        assert!(Serial::parse("").is_none());
        assert!(Serial::parse("a b").is_none());
        assert!(Serial::parse("x;rm").is_none());
        assert!(Serial::parse(&"a".repeat(65)).is_none());
    }

    #[test]
    fn parses_empty_list_after_daemon_start() {
        let out = "* daemon not running; starting now at tcp:5037\n* daemon started successfully\nList of devices attached\n\n";
        assert!(parse_devices(out).is_empty());
        assert!(server_started(out, ""));
    }

    #[test]
    fn parses_states() {
        let out = "List of devices attached\r\n\
            R58N12ABCDE            device usb:1-1 product:a12nnxx model:SM_A125F device:a12 transport_id:1\r\n\
            8XV7N18A27001234       unauthorized usb:1-2 transport_id:2\r\n\
            emulator-5554          offline transport_id:3\r\n\
            ZY2245ABCD             recovery usb:1-3 transport_id:4\r\n\
            QWERTY12               sideload\r\n\
            ABCDEF12               no permissions; see [http://developer.android.com/tools/device.html]\r\n";
        let entries = parse_devices(out);
        let states: Vec<_> = entries.iter().map(|e| e.state).collect();
        assert_eq!(
            states,
            vec![
                AdbState::Device,
                AdbState::Unauthorized,
                AdbState::Offline,
                AdbState::Recovery,
                AdbState::Sideload,
                AdbState::NoPermissions
            ]
        );
        assert_eq!(entries[0].serial.as_str(), "R58N12ABCDE");
    }

    #[test]
    fn ignores_lines_before_header_and_invalid_serials() {
        let out = "garbage device\nList of devices attached\nbad;serial device\n";
        assert!(parse_devices(out).is_empty());
    }

    #[test]
    fn builds_fixed_getprop_arguments() {
        let serial = Serial::parse("R58N12ABCDE").unwrap();
        assert_eq!(
            getprop_args(&serial, DeviceProp::SecurityPatch),
            [
                "-s",
                "R58N12ABCDE",
                "shell",
                "getprop",
                "ro.build.version.security_patch"
            ]
        );
    }
}
