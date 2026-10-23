//! Tautan resmi yang boleh dibuka aplikasi. UI hanya mengirim ID; URL ditentukan di sini,
//! sehingga frontend tidak dapat membuka URL arbitrer. Harus selaras dengan
//! `OFFICIAL_LINKS` di `src/data/catalog.ts`.

use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OfficialLinkId {
    PlatformTools,
    OemUsbDrivers,
    GoogleAccountRecovery,
    GoogleAccountHelp,
    AndroidHelp,
    XiaomiAccount,
    SamsungAccount,
}

impl OfficialLinkId {
    #[cfg(test)]
    pub const ALL: [OfficialLinkId; 7] = [
        OfficialLinkId::PlatformTools,
        OfficialLinkId::OemUsbDrivers,
        OfficialLinkId::GoogleAccountRecovery,
        OfficialLinkId::GoogleAccountHelp,
        OfficialLinkId::AndroidHelp,
        OfficialLinkId::XiaomiAccount,
        OfficialLinkId::SamsungAccount,
    ];

    pub fn url(self) -> &'static str {
        match self {
            OfficialLinkId::PlatformTools => {
                "https://developer.android.com/tools/releases/platform-tools"
            }
            OfficialLinkId::OemUsbDrivers => "https://developer.android.com/studio/run/oem-usb",
            OfficialLinkId::GoogleAccountRecovery => "https://accounts.google.com/signin/recovery",
            OfficialLinkId::GoogleAccountHelp => "https://support.google.com/accounts",
            OfficialLinkId::AndroidHelp => "https://support.google.com/android",
            OfficialLinkId::XiaomiAccount => "https://account.xiaomi.com",
            OfficialLinkId::SamsungAccount => "https://account.samsung.com",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_links_are_https() {
        for id in OfficialLinkId::ALL {
            assert!(id.url().starts_with("https://"), "{id:?}");
        }
    }

    #[test]
    fn deserializes_frontend_ids() {
        let id: OfficialLinkId = serde_json_like("\"googleAccountRecovery\"");
        assert_eq!(id, OfficialLinkId::GoogleAccountRecovery);
    }

    /// Hindari dependensi serde_json hanya untuk tes: deserialisasi lewat `serde::de::value`.
    fn serde_json_like(quoted: &str) -> OfficialLinkId {
        use serde::de::{value::StrDeserializer, IntoDeserializer};
        let raw = quoted.trim_matches('"');
        let de: StrDeserializer<'_, serde::de::value::Error> = raw.into_deserializer();
        OfficialLinkId::deserialize(de).expect("ID valid")
    }
}
