import type { Authorization, DeviceMode, Transport } from '@/types/domain'

export const TRANSPORT_LABELS: Record<Transport, string> = {
  usb: 'USB',
  adb: 'USB (ADB)',
  fastboot: 'USB (Fastboot)',
  unknown: 'Tidak diketahui',
}

export const AUTHORIZATION_LABELS: Record<Authorization, string> = {
  authorized: 'Terotorisasi',
  unauthorized: 'Belum diotorisasi',
  offline: 'Offline',
  unavailable: 'Tidak berlaku',
  unknown: 'Tidak diketahui',
}

export const MODE_LABELS: Record<DeviceMode, string> = {
  normal: 'Sistem normal',
  recovery: 'Recovery',
  sideload: 'Sideload',
  rescue: 'Rescue',
  bootloader: 'Bootloader (Fastboot)',
}
