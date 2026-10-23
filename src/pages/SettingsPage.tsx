import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { AppSelect } from '@/components/ui/AppSelect'
import { AppSwitch } from '@/components/ui/AppSwitch'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { useSettingsStore } from '@/store/settingsStore'

const NOT_YET = 'Belum tersedia'

const THEME_OPTIONS = [
  { value: 'dark', label: 'Gelap (default)' },
  { value: 'light', label: 'Terang', description: NOT_YET, disabled: true },
]

const LANGUAGE_OPTIONS = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'English', description: NOT_YET, disabled: true },
]

const AI_PROVIDER_OPTIONS = [
  { value: 'disabled', label: 'Nonaktif' },
  { value: 'cloud-byok', label: 'Provider cloud (API key milik Anda)', description: `${NOT_YET} — Milestone 4`, disabled: true },
  { value: 'local', label: 'Model lokal', description: `${NOT_YET} — fase lanjutan`, disabled: true },
]

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-fg-2">{label}</span>
      <div className="flex h-11 items-center rounded-ui-md border border-dashed border-line-default bg-field px-3.5 text-[15px] text-fg-muted">
        {value}
      </div>
      {hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
    </div>
  )
}

export function SettingsPage() {
  const demoMode = useAppStore((s) => s.demoMode)
  const liveDevice = useAppStore((s) => s.liveDevice)
  const setDemoMode = useAppStore((s) => s.setDemoMode)
  const theme = useSettingsStore((s) => s.theme)
  const language = useSettingsStore((s) => s.language)
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const aiHistoryEnabled = useSettingsStore((s) => s.aiHistoryEnabled)
  const update = useSettingsStore((s) => s.update)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" description="Pengaturan aplikasi, privasi, dan AI Assistant." />
      <InlineAlert tone="info" title="Pengaturan sesi">
        Pada versi ini pengaturan hanya berlaku selama aplikasi berjalan. Penyimpanan permanen dijadwalkan pada Milestone 3.
      </InlineAlert>

      <Panel aria-labelledby="demo-title" className="p-5">
        <SectionTitle id="demo-title">Mode Demo</SectionTitle>
        <div className="mt-3 max-w-[720px]">
          <AppSwitch
            label="Tampilkan data contoh"
            description={
              liveDevice
                ? 'Tidak dapat diaktifkan saat perangkat nyata tersambung.'
                : 'Menampilkan perangkat contoh berbadge DEMO untuk pratinjau UI. Tidak ada perintah dikirim ke perangkat.'
            }
            checked={demoMode}
            disabled={liveDevice !== null}
            onCheckedChange={setDemoMode}
          />
        </div>
      </Panel>

      <Panel aria-labelledby="appearance-title" className="p-5">
        <SectionTitle id="appearance-title">Tampilan</SectionTitle>
        <div className="mt-4 grid max-w-[720px] gap-4 md:grid-cols-2">
          <AppSelect label="Tema" value={theme} options={THEME_OPTIONS} onValueChange={(value) => update({ theme: value })} />
          <AppSelect
            label="Bahasa"
            value={language}
            options={LANGUAGE_OPTIONS}
            onValueChange={(value) => update({ language: value })}
          />
        </div>
      </Panel>

      <Panel aria-labelledby="paths-title" className="p-5">
        <SectionTitle id="paths-title">Lokasi</SectionTitle>
        <div className="mt-4 grid max-w-[720px] gap-4 md:grid-cols-2">
          <ReadOnlyField
            label="Android Platform-Tools"
            value="Belum dikonfigurasi"
            hint="Pemilihan dan validasi path dijadwalkan pada Milestone 2–3."
          />
          <ReadOnlyField label="Data & log" value="Belum disimpan ke disk" hint="Lokasi penyimpanan lokal: Milestone 3." />
        </div>
      </Panel>

      <Panel aria-labelledby="ai-settings-title" className="p-5">
        <SectionTitle id="ai-settings-title">AI Assistant</SectionTitle>
        <p className="mt-1 max-w-[80ch] text-sm text-fg-muted">
          AI bersifat opsional dan nonaktif secara default. Data hanya dikirim ke provider cloud setelah Anda melihat
          pratinjau dan menyetujuinya.
        </p>
        <div className="mt-4 grid max-w-[720px] gap-4 md:grid-cols-2">
          <AppSelect
            label="Provider AI"
            value={aiProvider}
            options={AI_PROVIDER_OPTIONS}
            onValueChange={(value) => update({ aiProvider: value })}
          />
          <AppSelect
            label="Model"
            value=""
            placeholder="Pilih provider terlebih dahulu"
            options={[]}
            disabled
            onValueChange={() => undefined}
            hint="Tersedia setelah provider dikonfigurasi."
          />
        </div>
        <div className="mt-5 max-w-[720px]">
          <AppSwitch
            label="Simpan riwayat percakapan AI"
            description="Default nonaktif. Bila diaktifkan nanti, riwayat disimpan lokal dan dapat dihapus. Belum tersedia."
            checked={aiHistoryEnabled}
            disabled
            onCheckedChange={() => undefined}
          />
        </div>
      </Panel>

      <Panel aria-labelledby="privacy-title" className="p-5">
        <SectionTitle id="privacy-title">Privasi</SectionTitle>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-fg-2">
          <li>Tidak ada telemetri jaringan.</li>
          <li>Tidak meminta atau menyimpan PIN, pola, kata sandi, OTP, atau token akun.</li>
          <li>Serial, IMEI, dan path pengguna disamarkan sebelum data apa pun dibagikan.</li>
        </ul>
      </Panel>
    </div>
  )
}
