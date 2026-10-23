import { Cloud, CloudOff, LoaderCircle, LogIn, Settings2, TriangleAlert } from 'lucide-react'
import { useCloudStore } from '@/store/cloudStore'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'

/** Status akun/cloud berdasarkan keadaan nyata (DESIGN.md §18) — tidak pernah memakai hijau "Device Ready". */
export function CloudStatusBadge() {
  const status = useCloudStore((s) => s.status)
  const online = useCloudStore((s) => s.online)

  let tone: BadgeTone = 'neutral'
  let label = 'Tidak masuk'
  let Icon = LogIn
  if (status === 'not_configured' || status === 'invalid_config') {
    tone = 'warning'
    label = status === 'not_configured' ? 'Supabase belum dikonfigurasi' : 'Konfigurasi Supabase tidak valid'
    Icon = Settings2
  } else if (!online) {
    tone = 'warning'
    label = 'Offline'
    Icon = CloudOff
  } else if (status === 'authenticating') {
    tone = 'info'
    label = 'Masuk…'
    Icon = LoaderCircle
  } else if (status === 'signed_in') {
    tone = 'info'
    label = 'Cloud tersambung'
    Icon = Cloud
  } else if (status === 'session_expired') {
    tone = 'warning'
    label = 'Sesi berakhir'
    Icon = TriangleAlert
  }
  return (
    <StatusBadge tone={tone} icon={Icon}>
      {label}
    </StatusBadge>
  )
}
