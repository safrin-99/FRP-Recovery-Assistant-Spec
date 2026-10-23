import { ArrowRight, Ban, ShieldAlert } from 'lucide-react'
import { OFFICIAL_LINKS } from '@/data/catalog'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DataPreservationBanner } from '@/components/safety/DataPreservationBanner'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { useAppStore } from '@/store/appStore'

const RISKS = [
  'Factory reset menghapus seluruh data pengguna di penyimpanan internal.',
  'Flashing firmware yang salah dapat membuat perangkat tidak bisa boot.',
  'Unlock bootloader umumnya menghapus data dan dapat memengaruhi garansi.',
  'Setelah reset, perangkat dapat tetap meminta akun Google/Xiaomi yang sebelumnya terikat (perlindungan anti-pencurian).',
]

const REQUIREMENTS = [
  'Catat keputusan pelanggan per tiket: setuju hapus data, data harus dipertahankan, atau belum memutuskan.',
  'Tinjau backup dan tanyakan kesiapan akun Google/Xiaomi tanpa meminta email atau kata sandi.',
  'Gunakan hanya prosedur dan firmware resmi dari produsen.',
  'Simpan bukti kepemilikan (nota pembelian) bila perlu bantuan servis resmi.',
]

export function FlashResetPage() {
  const setPage = useAppStore((s) => s.setPage)
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Flash / Factory Reset"
        description="Informasi risiko. Aplikasi tidak menjalankan flashing, wipe, factory reset, atau unlock bootloader dari komputer."
      />
      <DataPreservationBanner />

      <InlineAlert tone="warning" title="Guided Factory Reset ada di Screen Lock Recovery">
        Panduan reset resmi hanya dibuka untuk tiket yang pelanggannya eksplisit menyetujui penghapusan data, setelah
        preflight dan persetujuan tercatat. Teknisi menjalankan reset langsung di perangkat.{' '}
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 -ml-3"
          icon={<ArrowRight aria-hidden className="size-4" />}
          onClick={() => setPage('screen-lock')}
        >
          Buka Screen Lock Recovery
        </Button>
      </InlineAlert>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel aria-labelledby="risk-title" className="p-5">
          <div className="flex items-center gap-2.5">
            <ShieldAlert aria-hidden className="size-5 text-warning" />
            <SectionTitle id="risk-title">Risiko</SectionTitle>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-fg-2">
            {RISKS.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </Panel>
        <Panel aria-labelledby="req-title" className="p-5">
          <div className="flex items-center gap-2.5">
            <Ban aria-hidden className="size-5 text-cyan" />
            <SectionTitle id="req-title">Sebelum mempertimbangkan reset</SectionTitle>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-fg-2">
            {REQUIREMENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel aria-labelledby="official-title" className="p-5">
        <SectionTitle id="official-title">Panduan resmi</SectionTitle>
        <ul className="mt-3 space-y-2 text-[15px]">
          {[OFFICIAL_LINKS.googleUnlockHelp, OFFICIAL_LINKS.androidHelp, OFFICIAL_LINKS.googleAccountHelp].map((link) => (
            <li key={link.id}>
              <ExternalLink link={link} />
              <span className="ml-2 text-sm text-fg-muted">{link.description}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
