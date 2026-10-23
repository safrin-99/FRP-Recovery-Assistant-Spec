import { CircleSlash, KeyRound, LifeBuoy, Lock, UserRoundCheck, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { OFFICIAL_LINKS, type OfficialLink } from '@/data/catalog'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DataPreservationBanner } from '@/components/safety/DataPreservationBanner'
import { AppSelect } from '@/components/ui/AppSelect'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAppStore } from '@/store/appStore'
import type { BackupAnswer, UserAnswer } from '@/types/domain'

const YES_NO_OPTIONS = [
  { value: 'unanswered', label: 'Belum dijawab' },
  { value: 'yes', label: 'Ya' },
  { value: 'no', label: 'Tidak' },
]

const BACKUP_OPTIONS = [
  { value: 'unknown', label: 'Tidak tahu' },
  { value: 'yes', label: 'Ya, backup tersedia' },
  { value: 'no', label: 'Tidak ada backup' },
]

function isUserAnswer(value: string): value is UserAnswer {
  return value === 'unanswered' || value === 'yes' || value === 'no'
}

function isBackupAnswer(value: string): value is BackupAnswer {
  return value === 'unknown' || value === 'yes' || value === 'no'
}

function SituationCard({
  icon: Icon,
  title,
  children,
  links,
  action,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  links: ReadonlyArray<OfficialLink | undefined>
  action?: ReactNode
}) {
  return (
    <article className="flex min-w-0 flex-col gap-2.5 rounded-ui-md border border-line-default bg-panel p-4">
      <div className="flex items-center gap-2.5">
        <Icon aria-hidden className="size-5 shrink-0 text-cyan" />
        <h3 className="text-base font-semibold text-fg">{title}</h3>
      </div>
      <div className="text-sm leading-relaxed text-fg-2">{children}</div>
      <ul className="mt-auto space-y-1 pt-1 text-sm">
        {links.map((link) =>
          link ? (
            <li key={link.id}>
              <ExternalLink href={link.url}>{link.label}</ExternalLink>
            </li>
          ) : null,
        )}
      </ul>
      {action}
    </article>
  )
}

export function FrpRecoveryPage() {
  const screenLocked = useAppStore((s) => s.screenLocked)
  const dataImportant = useAppStore((s) => s.dataImportant)
  const backupAvailable = useAppStore((s) => s.backupAvailable)
  const setScreenLocked = useAppStore((s) => s.setScreenLocked)
  const setDataImportant = useAppStore((s) => s.setDataImportant)
  const setBackupAvailable = useAppStore((s) => s.setBackupAvailable)
  const setPage = useAppStore((s) => s.setPage)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="FRP Recovery"
        description="Pahami kondisi perlindungan perangkat dan pilih jalur pemulihan resmi. Aplikasi tidak menonaktifkan atau melewati perlindungan apa pun."
      />

      <Panel aria-labelledby="protection-title" className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <SectionTitle id="protection-title">Status perlindungan (FRP)</SectionTitle>
          <StatusBadge tone="warning">Tidak dapat diverifikasi melalui koneksi ini</StatusBadge>
        </div>
        <p className="mt-2 max-w-[80ch] text-[15px] leading-relaxed text-fg-2">
          Factory Reset Protection adalah fitur anti-pencurian Android. Statusnya tidak dapat dibaca secara andal melalui
          ADB/Fastboot standar, sehingga aplikasi tidak menebaknya. Pemulihan yang sah selalu memerlukan akun pemilik
          atau bantuan produsen resmi.
        </p>
      </Panel>

      <Panel aria-labelledby="condition-title" className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <SectionTitle id="condition-title">Kondisi perangkat</SectionTitle>
          <StatusBadge tone="info">Dari pengguna</StatusBadge>
        </div>
        <p className="mt-1 text-sm text-fg-muted">
          Jawaban Anda dipakai untuk menentukan prioritas langkah aman. Jangan masukkan PIN, pola, atau kata sandi.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <AppSelect
            label="Layar perangkat terkunci?"
            value={screenLocked}
            options={YES_NO_OPTIONS}
            onValueChange={(value) => {
              if (isUserAnswer(value)) setScreenLocked(value)
            }}
          />
          <AppSelect
            label="Ada data penting di perangkat?"
            value={dataImportant}
            options={YES_NO_OPTIONS}
            onValueChange={(value) => {
              if (isUserAnswer(value)) setDataImportant(value)
            }}
          />
          <AppSelect
            label="Backup data tersedia?"
            value={backupAvailable}
            options={BACKUP_OPTIONS}
            onValueChange={(value) => {
              if (isBackupAnswer(value)) setBackupAvailable(value)
            }}
          />
        </div>
        <DataPreservationBanner className="mt-4" />
      </Panel>

      <section aria-labelledby="situations-title" className="flex flex-col gap-3">
        <SectionTitle id="situations-title">Kenali situasinya</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          <SituationCard
            icon={KeyRound}
            title="Lupa PIN / pola layar"
            links={[OFFICIAL_LINKS.androidHelp, OFFICIAL_LINKS.samsungAccount]}
          >
            Data pada Android modern terenkripsi dan terikat dengan kredensial layar. Tanpa PIN/pola, tidak ada aplikasi
            yang dapat membukanya secara sah. Beberapa produsen menyediakan buka kunci jarak jauh resmi bila fitur itu
            sudah diaktifkan sebelumnya. Reset oleh pemilik menghapus data — periksa backup lebih dulu.
          </SituationCard>
          <SituationCard
            icon={Lock}
            title="Verifikasi akun Google setelah reset"
            links={[OFFICIAL_LINKS.googleAccountRecovery, OFFICIAL_LINKS.googleAccountHelp]}
          >
            Setelah reset, perangkat meminta akun Google yang terakhir tersinkron. Masuk dengan akun tersebut; bila lupa
            kata sandi, gunakan pemulihan akun Google. Jika akun tidak dapat dipulihkan, hubungi produsen atau servis
            resmi dengan bukti kepemilikan.
          </SituationCard>
          <SituationCard icon={UserRoundCheck} title="Akun Xiaomi" links={[OFFICIAL_LINKS.xiaomiAccount]}>
            Perangkat Xiaomi dapat terkunci oleh Akun Xiaomi. Pulihkan kata sandi melalui situs resmi Akun Xiaomi, atau
            hubungi layanan resmi Xiaomi dengan bukti pembelian.
          </SituationCard>
          <SituationCard
            icon={CircleSlash}
            title="Kerusakan sistem / tidak bisa boot"
            links={[OFFICIAL_LINKS.androidHelp]}
            action={
              <Button size="sm" className="self-start" icon={<LifeBuoy aria-hidden className="size-4" />} onClick={() => setPage('tools')}>
                Buka pemeriksaan Tools
              </Button>
            }
          >
            Jika perangkat bootloop atau berhenti di logo, periksa apakah perangkat terdeteksi melalui Fastboot lalu ikuti
            panduan resmi produsen. Hindari firmware dari sumber tidak resmi.
          </SituationCard>
        </div>
      </section>

      <InlineAlert tone="info" title="Privasi">
        Aplikasi tidak pernah meminta atau menyimpan PIN, pola, kata sandi, OTP, kode pemulihan, atau token akun.
      </InlineAlert>
    </div>
  )
}
