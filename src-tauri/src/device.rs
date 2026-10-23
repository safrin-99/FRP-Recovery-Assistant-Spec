//! Snapshot perangkat yang dikirim ke UI (PRD §11). Serial mentah tidak pernah ikut:
//! UI hanya menerima ID sesi internal (`device-1`, ...).

use std::{
    collections::HashMap,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Serialize;

use crate::adb::{AdbState, DeviceProp, Serial};

const MAX_TEXT_CHARS: usize = 64;

/// Nilai dari perangkat tidak tepercaya: hanya huruf/angka/spasi dan `._-+/()`, maks 64
/// karakter. Kosong → `None` (UI menampilkan "—").
pub fn sanitize_text(raw: &str) -> Option<String> {
    let cleaned: String = raw
        .trim()
        .chars()
        .filter(|c| {
            c.is_alphanumeric() || matches!(c, ' ' | '.' | '_' | '-' | '+' | '/' | '(' | ')')
        })
        .take(MAX_TEXT_CHARS)
        .collect();
    let cleaned = cleaned.trim().to_string();
    (!cleaned.is_empty()).then_some(cleaned)
}

#[derive(Debug, Default, Clone)]
pub struct DeviceProps {
    pub brand: Option<String>,
    pub model: Option<String>,
    pub market_name: Option<String>,
    pub android_version: Option<String>,
    pub security_patch: Option<String>,
}

impl DeviceProps {
    pub fn set(&mut self, prop: DeviceProp, value: Option<String>) {
        match prop {
            DeviceProp::Brand => self.brand = value,
            DeviceProp::Model => self.model = value,
            DeviceProp::MarketName => self.market_name = value.or(self.market_name.take()),
            DeviceProp::VendorMarketName => self.market_name = self.market_name.take().or(value),
            DeviceProp::AndroidRelease => self.android_version = value,
            DeviceProp::SecurityPatch => self.security_patch = value,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.brand.is_none() && self.model.is_none() && self.android_version.is_none()
    }

    pub fn label(&self) -> String {
        match (
            &self.brand,
            self.market_name.as_ref().or(self.model.as_ref()),
        ) {
            (Some(brand), Some(model)) => format!("{brand} {model}"),
            (Some(brand), None) => brand.clone(),
            (None, Some(model)) => model.clone(),
            (None, None) => "perangkat".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceSnapshotDto {
    pub id: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub model_code: Option<String>,
    pub android_version: Option<String>,
    pub security_patch: Option<String>,
    pub transport: &'static str,
    pub authorization: &'static str,
    pub mode: Option<&'static str>,
    pub detected_at_ms: u64,
    pub source: &'static str,
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn adb_authorization(state: AdbState) -> &'static str {
    match state {
        AdbState::Device => "authorized",
        AdbState::Unauthorized => "unauthorized",
        AdbState::Offline => "offline",
        AdbState::NoPermissions => "unavailable",
        _ => "unknown",
    }
}

fn adb_mode(state: AdbState) -> Option<&'static str> {
    match state {
        AdbState::Device => Some("normal"),
        AdbState::Recovery => Some("recovery"),
        AdbState::Sideload => Some("sideload"),
        AdbState::Rescue => Some("rescue"),
        _ => None,
    }
}

pub fn adb_snapshot(id: String, state: AdbState, props: Option<&DeviceProps>) -> DeviceSnapshotDto {
    let props = props.cloned().unwrap_or_default();
    DeviceSnapshotDto {
        id,
        brand: props.brand,
        model: props.market_name.or_else(|| props.model.clone()),
        model_code: props.model,
        android_version: props.android_version,
        security_patch: props.security_patch,
        transport: "adb",
        authorization: adb_authorization(state),
        mode: adb_mode(state),
        detected_at_ms: now_ms(),
        source: "live",
    }
}

pub fn fastboot_snapshot(id: String, product: Option<String>) -> DeviceSnapshotDto {
    DeviceSnapshotDto {
        id,
        brand: None,
        model: None,
        model_code: product,
        android_version: None,
        security_patch: None,
        transport: "fastboot",
        // Otorisasi USB debugging tidak berlaku di mode bootloader.
        authorization: "unavailable",
        mode: Some("bootloader"),
        detected_at_ms: now_ms(),
        source: "live",
    }
}

/// Memetakan serial → ID sesi. Hanya ada di memori selama aplikasi berjalan.
#[derive(Debug, Default)]
pub struct DeviceRegistry {
    ids: HashMap<String, String>,
    next: u32,
}

impl DeviceRegistry {
    pub fn id_for(&mut self, serial: &Serial) -> String {
        if let Some(id) = self.ids.get(serial.as_str()) {
            return id.clone();
        }
        self.next += 1;
        let id = format!("device-{}", self.next);
        self.ids.insert(serial.as_str().to_string(), id.clone());
        id
    }

    pub fn known_serials(&self) -> Vec<String> {
        self.ids.keys().cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_untrusted_text() {
        assert_eq!(
            sanitize_text("  Galaxy A12 \r\n").as_deref(),
            Some("Galaxy A12")
        );
        assert_eq!(
            sanitize_text("<script>x</script>").as_deref(),
            Some("scriptx/script")
        );
        assert_eq!(
            sanitize_text("moto g(8) power").as_deref(),
            Some("moto g(8) power")
        );
        assert_eq!(sanitize_text("\u{0}\u{7}").as_deref(), None);
        assert_eq!(sanitize_text(&"a".repeat(100)).map(|s| s.len()), Some(64));
    }

    #[test]
    fn prefers_market_name_and_keeps_model_code() {
        let mut props = DeviceProps::default();
        props.set(DeviceProp::Brand, Some("Xiaomi".into()));
        props.set(DeviceProp::Model, Some("M2101K7AG".into()));
        props.set(DeviceProp::VendorMarketName, Some("Redmi Note 10".into()));
        let dto = adb_snapshot("device-1".into(), AdbState::Device, Some(&props));
        assert_eq!(dto.model.as_deref(), Some("Redmi Note 10"));
        assert_eq!(dto.model_code.as_deref(), Some("M2101K7AG"));
        assert_eq!(dto.authorization, "authorized");
        assert_eq!(dto.mode, Some("normal"));
        assert_eq!(props.label(), "Xiaomi Redmi Note 10");
    }

    #[test]
    fn maps_unauthorized_devices_without_props() {
        let dto = adb_snapshot("device-2".into(), AdbState::Unauthorized, None);
        assert_eq!(dto.authorization, "unauthorized");
        assert_eq!(dto.brand, None);
        assert_eq!(dto.source, "live");
    }

    #[test]
    fn assigns_stable_session_ids_without_exposing_serials() {
        let mut registry = DeviceRegistry::default();
        let a = Serial::parse("R58N12ABCDE").unwrap();
        let b = Serial::parse("ZY2245ABCD").unwrap();
        assert_eq!(registry.id_for(&a), "device-1");
        assert_eq!(registry.id_for(&b), "device-2");
        assert_eq!(registry.id_for(&a), "device-1");
        assert!(!registry.id_for(&a).contains("R58N"));
    }
}
