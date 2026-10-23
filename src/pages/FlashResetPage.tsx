import { Ban, ShieldAlert } from 'lucide-react'
import { OFFICIAL_LINKS } from '@/data/catalog'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DataPreservationBanner } from '@/components/safety/DataPreservationBanner'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'

const RISKS = [
  'Factory reset menghapus seluruh data pengguna di penyimpanan internal.',
  'Flashing firmware yang salah dapat membuat perangkat tidak bisa boot.',
  'Unlock bootloader umumnya menghapus data dan dapat memengaruhi garansi.',
  'Setelah reset, perangkat tetap meminta akun Google yang sebelumnya tersinkron (perlindungan anti-pencurian).',
]

const REQUIREMENTS = [
  'Pastikan backup data sudah tersedia dan dapat dipulihkan.',
  'Siapkan kredensial akun Google/produsen yang terhubung ke perangkat.',
  'Gunakan hanya prosedur dan firmware resmi dari produsen.',
  'Simpan bukti kepemilikan (nota pembelian) bila perlu bantuan servis resmi.',
]

export function FlashResetPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Flash / Factory Reset"
        description="Halaman informasi risiko. Versi ini tidak melakukan flashing, factory reset, unlock bootloader, atau penghapusan data."
      />
      <DataPreservationBanner />

      <InlineAlert tone="warning" title="Tidak ada tindakan destruktif di aplikasi ini">
        Tindakan seperti reset atau flashing dapat menghapus data secara permanen. Lakukan hanya mengikuti panduan resmi
        produsen setelah backup dipastikan.
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
          {[OFFICIAL_LINKS.androidHelp, OFFICIAL_LINKS.googleAccountHelp].map((link) => (
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
