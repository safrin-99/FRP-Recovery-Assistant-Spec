import {
  Activity,
  Bot,
  FileText,
  Headset,
  House,
  LifeBuoy,
  Lock,
  RefreshCcw,
  Settings,
  Smartphone,
  UserRoundCheck,
  Wrench,
  Cpu,
  type LucideIcon,
} from 'lucide-react'
import type { BrandId, MethodId, PageId } from '@/types/domain'

/** Urutan sidebar mengikuti PRD §7 / DESIGN.md §6. */
export const NAV_ITEMS: ReadonlyArray<{ id: PageId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'frp-recovery', label: 'FRP Recovery', icon: Lock },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
  { id: 'device-info', label: 'Device Info', icon: Smartphone },
  { id: 'flash-reset', label: 'Flash / Factory Reset', icon: RefreshCcw },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'drivers', label: 'Drivers', icon: Cpu },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export const PAGE_TITLES: Record<PageId, string> = {
  home: 'Home',
  'frp-recovery': 'FRP Recovery',
  'ai-assistant': 'AI Recovery Assistant',
  'device-info': 'Device Info',
  'flash-reset': 'Flash / Factory Reset',
  tools: 'Tools',
  drivers: 'Drivers',
  logs: 'Logs',
  settings: 'Settings',
}

/**
 * Empat jalur diagnosis (DESIGN.md §8). Deskripsi hanya menyebut hal yang memang
 * menjadi tujuan fitur — tidak ada exploit/bypass.
 */
export const METHODS: ReadonlyArray<{
  id: MethodId
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    id: 'adb-diagnostics',
    title: 'ADB Diagnostics',
    description: 'Periksa koneksi USB, otorisasi ADB, dan info perangkat.',
    icon: Activity,
  },
  {
    id: 'fastboot-guide',
    title: 'Recovery / Fastboot Guide',
    description: 'Deteksi Fastboot dan panduan resmi bila gagal boot.',
    icon: LifeBuoy,
  },
  {
    id: 'account-recovery',
    title: 'Account Recovery',
    description: 'Checklist pemulihan akun Google/Xiaomi resmi.',
    icon: UserRoundCheck,
  },
  {
    id: 'official-service',
    title: 'Official Service',
    description: 'Tautan dukungan produsen dan servis resmi.',
    icon: Headset,
  },
]

/** Urutan brand: baris 1 (5 brand), baris 2 (6 brand) — DESIGN.md §8. */
export const BRAND_ROWS: ReadonlyArray<ReadonlyArray<{ id: BrandId; label: string }>> = [
  [
    { id: 'samsung', label: 'Samsung' },
    { id: 'xiaomi', label: 'Xiaomi' },
    { id: 'oppo', label: 'OPPO' },
    { id: 'vivo', label: 'vivo' },
    { id: 'realme', label: 'realme' },
  ],
  [
    { id: 'infinix', label: 'Infinix' },
    { id: 'tecno', label: 'TECNO' },
    { id: 'huawei', label: 'HUAWEI' },
    { id: 'motorola', label: 'Motorola' },
    { id: 'asus', label: 'ASUS' },
    { id: 'other', label: 'Other' },
  ],
]

export const BRAND_LABELS: Record<BrandId, string> = Object.fromEntries(
  BRAND_ROWS.flat().map((brand) => [brand.id, brand.label]),
) as Record<BrandId, string>

export interface OfficialLink {
  id: string
  label: string
  description: string
  url: string
}

/**
 * Katalog tautan resmi (hanya https, hanya domain penerbit resmi). Tautan dalam
 * (deep link) per merek sengaja belum dimasukkan sampai dikurasi dan diverifikasi.
 */
export const OFFICIAL_LINKS: Record<string, OfficialLink> = {
  platformTools: {
    id: 'platformTools',
    label: 'Android SDK Platform-Tools',
    description: 'Unduhan resmi ADB dan Fastboot dari Android Developers.',
    url: 'https://developer.android.com/tools/releases/platform-tools',
  },
  oemUsbDrivers: {
    id: 'oemUsbDrivers',
    label: 'Driver USB OEM resmi',
    description: 'Daftar halaman driver USB resmi dari produsen (Android Developers).',
    url: 'https://developer.android.com/studio/run/oem-usb',
  },
  googleAccountRecovery: {
    id: 'googleAccountRecovery',
    label: 'Pemulihan Akun Google',
    description: 'Halaman resmi Google untuk memulihkan akses akun.',
    url: 'https://accounts.google.com/signin/recovery',
  },
  googleAccountHelp: {
    id: 'googleAccountHelp',
    label: 'Bantuan Akun Google',
    description: 'Pusat Bantuan Akun Google.',
    url: 'https://support.google.com/accounts',
  },
  androidHelp: {
    id: 'androidHelp',
    label: 'Bantuan Android',
    description: 'Pusat Bantuan Android resmi (termasuk perlindungan perangkat).',
    url: 'https://support.google.com/android',
  },
  xiaomiAccount: {
    id: 'xiaomiAccount',
    label: 'Akun Xiaomi',
    description: 'Situs resmi Akun Xiaomi untuk pemulihan akun.',
    url: 'https://account.xiaomi.com',
  },
  samsungAccount: {
    id: 'samsungAccount',
    label: 'Akun Samsung',
    description: 'Situs resmi Akun Samsung untuk pemulihan akun.',
    url: 'https://account.samsung.com',
  },
}
