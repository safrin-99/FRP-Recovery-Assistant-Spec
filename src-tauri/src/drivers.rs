//! Pemeriksaan driver USB Android lewat SetupAPI/CfgMgr32 Windows (PRD §7.7). Hanya membaca
//! daftar perangkat Device Manager; tidak memasang atau mengubah driver.

use serde::Serialize;

const ADB_INTERFACE: &str = "USB\\CLASS_FF&SUBCLASS_42&PROT_01";
const FASTBOOT_INTERFACE: &str = "USB\\CLASS_FF&SUBCLASS_42&PROT_03";

/// Vendor ID USB umum perangkat Android. Hanya dugaan: satu VID dapat dipakai banyak merek.
const VENDORS: &[(&str, &str)] = &[
    ("18D1", "Google/umum"),
    ("04E8", "Samsung"),
    ("2717", "Xiaomi"),
    ("22D9", "OPPO/realme"),
    ("2D95", "vivo"),
    ("12D1", "HUAWEI"),
    ("22B8", "Motorola"),
    ("0B05", "ASUS"),
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverEntry {
    pub name: String,
    /// `adb` | `fastboot` | `android-usb`
    pub interface: &'static str,
    /// Dugaan merek dari Vendor ID USB.
    pub vendor_guess: Option<&'static str>,
    /// `ok` | `problem` | `disabled` | `unknown`
    pub status: &'static str,
    pub problem_code: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverReport {
    pub entries: Vec<DriverEntry>,
    /// `ok` | `warning` | `info`
    pub level: &'static str,
    pub summary: String,
}

fn vendor_from_ids(ids: &[String]) -> Option<&'static str> {
    ids.iter().find_map(|id| {
        let upper = id.to_ascii_uppercase();
        let start = upper.find("VID_")? + 4;
        let vid = upper.get(start..start + 4)?;
        VENDORS
            .iter()
            .find(|(code, _)| *code == vid)
            .map(|(_, name)| *name)
    })
}

/// Klasifikasi perangkat dari Hardware ID dan Compatible ID. `None` = bukan perangkat Android.
pub fn classify(
    hardware_ids: &[String],
    compatible_ids: &[String],
) -> Option<(&'static str, Option<&'static str>)> {
    let vendor = vendor_from_ids(hardware_ids);
    let compat: Vec<String> = compatible_ids
        .iter()
        .map(|id| id.to_ascii_uppercase())
        .collect();
    if compat.iter().any(|id| id == ADB_INTERFACE) {
        return Some(("adb", vendor));
    }
    if compat.iter().any(|id| id == FASTBOOT_INTERFACE) {
        return Some(("fastboot", vendor));
    }
    // Perangkat induk USB (bukan antarmuka `&MI_xx`) dengan Vendor ID Android yang dikenal.
    let is_parent = hardware_ids.iter().any(|id| {
        id.to_ascii_uppercase().starts_with("USB\\VID_")
            && !id.to_ascii_uppercase().contains("&MI_")
    });
    match vendor {
        Some(vendor) if is_parent => Some(("android-usb", Some(vendor))),
        _ => None,
    }
}

pub fn summarize(entries: Vec<DriverEntry>) -> DriverReport {
    let problems: Vec<&DriverEntry> = entries.iter().filter(|e| e.status == "problem").collect();
    let has_debug_interface = entries
        .iter()
        .any(|e| matches!(e.interface, "adb" | "fastboot") && e.status == "ok");
    let (level, summary) = if entries.is_empty() {
        (
            "info",
            "Windows tidak melihat antarmuka ADB/Fastboot atau perangkat Android yang dikenal. Hubungkan perangkat dengan kabel data dan aktifkan USB debugging, lalu periksa lagi.".to_string(),
        )
    } else if let Some(first) = problems.first() {
        (
            "warning",
            format!(
                "{} perangkat Android bermasalah di Device Manager (kode {}). Pasang driver USB resmi dari produsen perangkat.",
                problems.len(),
                first.problem_code.unwrap_or_default()
            ),
        )
    } else if has_debug_interface {
        (
            "ok",
            "Driver antarmuka ADB/Fastboot terpasang dan aktif.".to_string(),
        )
    } else {
        (
            "info",
            "Perangkat Android terhubung, tetapi antarmuka ADB tidak terlihat. Aktifkan USB debugging pada perangkat.".to_string(),
        )
    };
    DriverReport {
        entries,
        level,
        summary,
    }
}

#[cfg(windows)]
pub fn scan() -> Result<Vec<DriverEntry>, String> {
    use windows_sys::Win32::Devices::DeviceAndDriverInstallation::{
        CM_Get_DevNode_Status, SetupDiDestroyDeviceInfoList, SetupDiEnumDeviceInfo,
        SetupDiGetClassDevsW, SetupDiGetDeviceRegistryPropertyW, CM_PROB_DISABLED, CR_SUCCESS,
        DIGCF_ALLCLASSES, DIGCF_PRESENT, DN_HAS_PROBLEM, HDEVINFO, SPDRP_COMPATIBLEIDS,
        SPDRP_DEVICEDESC, SPDRP_FRIENDLYNAME, SPDRP_HARDWAREID, SP_DEVINFO_DATA,
    };

    struct DevInfoSet(HDEVINFO);
    impl Drop for DevInfoSet {
        fn drop(&mut self) {
            // SAFETY: handle valid dari SetupDiGetClassDevsW dan hanya dihancurkan sekali.
            unsafe { SetupDiDestroyDeviceInfoList(self.0) };
        }
    }

    /// Membaca properti registry perangkat sebagai UTF-16 (REG_SZ / REG_MULTI_SZ).
    fn read_prop(set: HDEVINFO, data: &SP_DEVINFO_DATA, prop: u32) -> Vec<String> {
        let mut buffer = vec![0u8; 1024];
        for _ in 0..2 {
            let mut required = 0u32;
            let mut reg_type = 0u32;
            // SAFETY: buffer dan pointer valid selama panggilan; ukuran buffer diberikan.
            let ok = unsafe {
                SetupDiGetDeviceRegistryPropertyW(
                    set,
                    data,
                    prop,
                    &mut reg_type,
                    buffer.as_mut_ptr(),
                    buffer.len() as u32,
                    &mut required,
                )
            };
            if ok != 0 {
                let len = (required as usize).min(buffer.len());
                let words: Vec<u16> = buffer[..len]
                    .as_chunks::<2>()
                    .0
                    .iter()
                    .map(|c| u16::from_le_bytes(*c))
                    .collect();
                return words
                    .split(|w| *w == 0)
                    .filter(|part| !part.is_empty())
                    .map(String::from_utf16_lossy)
                    .collect();
            }
            if (required as usize) <= buffer.len() || required > 64 * 1024 {
                break;
            }
            buffer.resize(required as usize, 0);
        }
        Vec::new()
    }

    fn node_status(dev_inst: u32) -> (&'static str, Option<u32>) {
        let mut status = 0u32;
        let mut problem = 0u32;
        // SAFETY: pointer ke variabel lokal; dev_inst dari SP_DEVINFO_DATA.
        let result = unsafe { CM_Get_DevNode_Status(&mut status, &mut problem, dev_inst, 0) };
        if result != CR_SUCCESS {
            ("unknown", None)
        } else if status & DN_HAS_PROBLEM != 0 {
            (
                if problem == CM_PROB_DISABLED {
                    "disabled"
                } else {
                    "problem"
                },
                Some(problem),
            )
        } else {
            ("ok", None)
        }
    }

    // SAFETY: semua argumen null diperbolehkan oleh SetupDiGetClassDevsW dengan DIGCF_ALLCLASSES.
    let handle = unsafe {
        SetupDiGetClassDevsW(
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null_mut(),
            DIGCF_PRESENT | DIGCF_ALLCLASSES,
        )
    };
    if handle == -1 {
        return Err("Daftar perangkat Windows tidak dapat dibaca.".into());
    }
    let set = DevInfoSet(handle);

    let mut entries = Vec::new();
    for index in 0..4096u32 {
        // SAFETY: SP_DEVINFO_DATA adalah struct C biasa; cbSize diisi sesuai kontrak API.
        let mut data: SP_DEVINFO_DATA = unsafe { std::mem::zeroed() };
        data.cbSize = std::mem::size_of::<SP_DEVINFO_DATA>() as u32;
        // SAFETY: handle valid; data menunjuk ke struct yang sudah diinisialisasi.
        if unsafe { SetupDiEnumDeviceInfo(set.0, index, &mut data) } == 0 {
            break;
        }
        let hardware_ids = read_prop(set.0, &data, SPDRP_HARDWAREID);
        let compatible_ids = read_prop(set.0, &data, SPDRP_COMPATIBLEIDS);
        let Some((interface, vendor_guess)) = classify(&hardware_ids, &compatible_ids) else {
            continue;
        };
        let name = read_prop(set.0, &data, SPDRP_FRIENDLYNAME)
            .into_iter()
            .chain(read_prop(set.0, &data, SPDRP_DEVICEDESC))
            .find_map(|name| crate::device::sanitize_text(&name))
            .unwrap_or_else(|| "Perangkat USB".to_string());
        let (status, problem_code) = node_status(data.DevInst);
        entries.push(DriverEntry {
            name,
            interface,
            vendor_guess,
            status,
            problem_code,
        });
    }
    Ok(entries)
}

#[cfg(not(windows))]
pub fn scan() -> Result<Vec<DriverEntry>, String> {
    Err("Pemeriksaan driver hanya tersedia di Windows.".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn detects_adb_and_fastboot_interfaces() {
        let hw = ids(&[
            "USB\\VID_04E8&PID_6860&REV_0400&MI_02",
            "USB\\VID_04E8&PID_6860&MI_02",
        ]);
        let compat = ids(&[
            "USB\\Class_ff&SubClass_42&Prot_01",
            "USB\\Class_ff&SubClass_42",
            "USB\\Class_ff",
        ]);
        assert_eq!(classify(&hw, &compat), Some(("adb", Some("Samsung"))));

        let compat = ids(&["USB\\Class_ff&SubClass_42&Prot_03"]);
        assert_eq!(
            classify(&ids(&["USB\\VID_18D1&PID_4EE0"]), &compat),
            Some(("fastboot", Some("Google/umum")))
        );
    }

    #[test]
    fn keeps_known_android_parents_and_ignores_others() {
        assert_eq!(
            classify(
                &ids(&["USB\\VID_2717&PID_FF48&REV_0223"]),
                &ids(&["USB\\Class_00"])
            ),
            Some(("android-usb", Some("Xiaomi")))
        );
        // Antarmuka MTP (MI_00) dari induk yang sama tidak diduplikasi.
        assert_eq!(
            classify(
                &ids(&["USB\\VID_2717&PID_FF48&MI_00"]),
                &ids(&["USB\\Class_06"])
            ),
            None
        );
        // Perangkat bukan Android.
        assert_eq!(
            classify(&ids(&["USB\\VID_046D&PID_C52B"]), &ids(&["USB\\Class_03"])),
            None
        );
        assert_eq!(classify(&[], &[]), None);
    }

    fn entry(interface: &'static str, status: &'static str, code: Option<u32>) -> DriverEntry {
        DriverEntry {
            name: "X".into(),
            interface,
            vendor_guess: None,
            status,
            problem_code: code,
        }
    }

    #[test]
    fn summarizes_reports() {
        assert_eq!(summarize(vec![]).level, "info");
        assert_eq!(summarize(vec![entry("adb", "ok", None)]).level, "ok");
        let report = summarize(vec![entry("adb", "problem", Some(28))]);
        assert_eq!(report.level, "warning");
        assert!(report.summary.contains("kode 28"));
        assert!(summarize(vec![entry("android-usb", "ok", None)])
            .summary
            .contains("USB debugging"));
    }
}
