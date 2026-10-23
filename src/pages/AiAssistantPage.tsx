import { Bot, House, LifeBuoy, Send, Settings } from 'lucide-react'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { selectActiveDevice, useAppStore } from '@/store/appStore'
import { useSettingsStore } from '@/store/settingsStore'
import { TRANSPORT_LABELS } from '@/lib/deviceLabels'

const MAX_CHARS = 1000

type ContextSource = 'Terdeteksi' | 'Dari pengguna' | 'Dugaan' | 'Tidak diketahui' | 'DEMO'

const SOURCE_TONE: Record<ContextSource, BadgeTone> = {
  Terdeteksi: 'info',
  'Dari pengguna': 'neutral',
  Dugaan: 'warning',
  'Tidak diketahui': 'neutral',
  DEMO: 'demo',
}

const EXAMPLE_QUESTIONS = [
  'Apa arti status ADB "unauthorized"?',
  'Bagaimana memeriksa backup sebelum langkah pemulihan?',
  'Apa beda lupa PIN layar dan verifikasi akun Google setelah reset?',
]

function ContextRow({ label, value, source }: { label: string; value: string; source: ContextSource }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-fg-2">{label}</p>
        <p className="truncate text-[15px] font-semibold text-fg">{value}</p>
      </div>
      <StatusBadge tone={SOURCE_TONE[source]} className="mt-0.5">
        {source}
      </StatusBadge>
    </li>
  )
}

export function AiAssistantPage() {
  const device = useAppStore(selectActiveDevice)
  const logCount = useAppStore((s) => s.logs.length)
  const screenLocked = useAppStore((s) => s.screenLocked)
  const setPage = useAppStore((s) => s.setPage)
  const provider = useSettingsStore((s) => s.aiProvider)
  const configured = provider !== 'disabled'

  const deviceSource: ContextSource = device ? (device.source === 'demo' ? 'DEMO' : 'Terdeteksi') : 'Tidak diketahui'
  const deviceValue = device ? `${device.brand ?? '—'} ${device.model ?? ''}`.trim() : '—'
  const screenValue = screenLocked === 'yes' ? 'Terkunci' : screenLocked === 'no' ? 'Tidak terkunci' : '—'

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="AI Recovery Assistant"
        description="AI membantu menjelaskan diagnosis dan menyusun langkah aman. AI tidak membuka PIN/pola, tidak menonaktifkan FRP, dan tidak menjalankan perintah perangkat."
        actions={<StatusBadge tone={configured ? 'success' : 'neutral'}>{configured ? 'Siap' : 'Belum dikonfigurasi'}</StatusBadge>}
      />

      <div className="flex flex-1 gap-4 max-[1199px]:flex-col">
        <Panel aria-labelledby="ai-conversation-title" className="flex min-h-[420px] min-w-0 flex-1 flex-col p-5">
          <h2 id="ai-conversation-title" className="sr-only">
            Percakapan
          </h2>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <EmptyState
              icon={Bot}
              title="AI belum dikonfigurasi"
              description="Provider AI nonaktif. Diagnosis manual dan panduan resmi tetap dapat digunakan tanpa AI."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="sm" icon={<Settings aria-hidden className="size-4" />} onClick={() => setPage('settings')}>
                    Buka Settings
                  </Button>
                  <Button size="sm" icon={<House aria-hidden className="size-4" />} onClick={() => setPage('home')}>
                    Diagnosis manual
                  </Button>
                  <Button size="sm" icon={<LifeBuoy aria-hidden className="size-4" />} onClick={() => setPage('frp-recovery')}>
                    Bantuan resmi
                  </Button>
                </div>
              }
            />
            <div className="mt-4 w-full max-w-[520px]">
              <p className="text-sm font-medium text-fg-2">Contoh pertanyaan setelah AI dikonfigurasi:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-muted">
                {EXAMPLE_QUESTIONS.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          </div>

          <form className="mt-4 shrink-0" onSubmit={(event) => event.preventDefault()} aria-label="Kirim pertanyaan ke AI">
            <label htmlFor="ai-composer" className="sr-only">
              Pertanyaan untuk AI
            </label>
            <div className="flex items-end gap-2 rounded-ui-md border border-line-default bg-field p-2 opacity-70">
              <textarea
                id="ai-composer"
                rows={2}
                maxLength={MAX_CHARS}
                disabled={!configured}
                placeholder="AI belum dikonfigurasi — aktifkan provider di Settings."
                className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-fg outline-none placeholder:text-fg-muted disabled:cursor-not-allowed"
              />
              <Button type="submit" variant="solid" size="sm" disabled={!configured} icon={<Send aria-hidden className="size-4" />}>
                Kirim
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-fg-muted">
              Jangan masukkan PIN, pola, kata sandi, OTP, kode pemulihan, atau token. Maks. {MAX_CHARS} karakter.
            </p>
          </form>
        </Panel>

        <Panel aria-labelledby="ai-context-title" className="flex w-[clamp(300px,24.8vw,381px)] shrink-0 flex-col p-5 max-[1199px]:w-full">
          <SectionTitle id="ai-context-title">Konteks diagnosis</SectionTitle>
          <p className="mt-1 text-sm text-fg-muted">Pratinjau data yang akan dibagikan bila AI aktif dan Anda menyetujuinya.</p>
          <ul className="mt-3">
            <ContextRow label="Perangkat" value={deviceValue} source={deviceSource} />
            <ContextRow
              label="Jenis koneksi"
              value={device ? TRANSPORT_LABELS[device.transport] : '—'}
              source={device ? deviceSource : 'Tidak diketahui'}
            />
            <ContextRow label="Kondisi layar" value={screenValue} source={screenLocked === 'unanswered' ? 'Tidak diketahui' : 'Dari pengguna'} />
            <ContextRow label="Log tersanitasi" value={`${logCount} entri`} source={logCount > 0 ? 'Terdeteksi' : 'Tidak diketahui'} />
          </ul>
          <div className="mt-4 rounded-ui-md border border-line bg-field px-3.5 py-3 text-sm leading-relaxed text-fg-2">
            <p className="font-semibold text-fg">Tidak pernah dikirim</p>
            <p>Serial, IMEI, path pengguna, PIN/pola, kata sandi, OTP, dan token akun.</p>
          </div>
        </Panel>
      </div>
    </div>
  )
}
