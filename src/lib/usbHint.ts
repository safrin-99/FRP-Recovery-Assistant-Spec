import type { DriverReport } from '@/services/nativeTypes'

/**
 * Penjelasan "kenapa tidak terdeteksi" dari daftar perangkat USB Windows, dipakai saat
 * adb/fastboot tidak menemukan perangkat. Hanya berdasarkan antarmuka yang benar-benar
 * dilaporkan Windows; merek dari Vendor ID ditandai sebagai dugaan oleh pemanggil.
 */
export function usbHintFromReport(report: DriverReport): string | null {
  const problem = report.entries.find((entry) => entry.status === 'problem')
  if (problem) {
    const code = problem.problemCode !== null ? ` (kode ${problem.problemCode})` : ''
    return `Windows melihat "${problem.name}", tetapi drivernya bermasalah${code}. Pasang driver USB resmi produsen (halaman Drivers).`
  }

  const hasDebugInterface = report.entries.some((entry) => entry.interface === 'adb' || entry.interface === 'fastboot')
  if (hasDebugInterface) {
    return 'Antarmuka ADB/Fastboot terlihat di Windows, tetapi belum siap. Cabut-pasang kabel, buka kunci layar, lalu tekan "Izinkan" pada dialog USB debugging di ponsel.'
  }

  const android = report.entries.find((entry) => entry.interface === 'android-usb')
  if (android) {
    const who = android.vendorGuess ? `Ponsel ${android.vendorGuess} ("${android.name}")` : `"${android.name}"`
    return `${who} terhubung ke Windows, tetapi USB debugging belum aktif. Aktifkan Opsi pengembang → USB debugging di ponsel, lalu izinkan komputer ini.`
  }

  return null
}
