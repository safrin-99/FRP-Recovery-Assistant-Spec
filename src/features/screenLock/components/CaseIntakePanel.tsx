import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { SectionTitle } from '@/components/layout/PageHeader'
import { AppSelect } from '@/components/ui/AppSelect'
import { AppSwitch } from '@/components/ui/AppSwitch'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TextField } from '@/components/ui/TextField'
import { BRAND_LABELS } from '@/data/catalog'
import { selectActiveDevice, useAppStore } from '@/store/appStore'
import {
  ACCESS_STATE_LABELS,
  BACKUP_STATUS_LABELS,
  DATA_PREFERENCE_LABELS,
  ISSUE_TYPE_LABELS,
  ReportedModelSchema,
  type RecoveryCase,
} from '../model'
import { useScreenLockStore } from '../store'
import { BRAND_OPTIONS, optionsFrom, pick } from './options'

/** Intake tiket (DESIGN.md §19): data servis minimum, tanpa PIN/pola/sandi/OTP atau identitas pelanggan. */
export function CaseIntakePanel({ c }: { c: RecoveryCase }) {
  const update = useScreenLockStore((s) => s.update)
  const device = useAppStore(selectActiveDevice)
  const [modelDraft, setModelDraft] = useState(c.model ?? '')
  const [modelError, setModelError] = useState<string>()
  const liveModel = device?.source === 'live' ? (device.model ?? device.modelCode) : null

  const commitModel = () => {
    const trimmed = modelDraft.trim()
    if (!trimmed) {
      setModelError(undefined)
      if (c.model !== null) update({ model: null, modelSource: 'unknown' })
      return
    }
    const parsed = ReportedModelSchema.safeParse(trimmed)
    if (!parsed.success) {
      setModelError(parsed.error.issues[0]?.message)
      return
    }
    setModelError(undefined)
    if (parsed.data !== c.model) update({ model: parsed.data, modelSource: 'reported' })
  }

  return (
    <Panel aria-labelledby="intake-title" className="@container p-5">
      <div className="flex flex-wrap items-center gap-3">
        <SectionTitle id="intake-title">Intake tiket</SectionTitle>
        <StatusBadge tone="info">Dari teknisi</StatusBadge>
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        Catat informasi servis minimum. Jangan pernah meminta PIN, pola, kata sandi, OTP, kode pemulihan, email akun,
        atau konten pribadi pelanggan.
      </p>

      <div className="mt-4 grid gap-4 @[560px]:grid-cols-2 @[860px]:grid-cols-3">
        <AppSelect
          label="Preferensi data pelanggan"
          placeholder="Tanyakan ke pelanggan…"
          value={c.dataPreference ?? ''}
          options={optionsFrom(DATA_PREFERENCE_LABELS)}
          hint="Wajib dipilih per tiket. Tidak ada pilihan bawaan."
          onValueChange={(value) => {
            const dataPreference = pick(DATA_PREFERENCE_LABELS, value)
            if (dataPreference) update({ dataPreference })
          }}
        />
        <AppSelect
          label="Tipe masalah"
          placeholder="Pilih tipe masalah…"
          value={c.issueType ?? ''}
          options={optionsFrom(ISSUE_TYPE_LABELS)}
          onValueChange={(value) => {
            const issueType = pick(ISSUE_TYPE_LABELS, value)
            if (issueType) update({ issueType })
          }}
        />
        <AppSelect
          label="Merek"
          value={c.brand}
          options={BRAND_OPTIONS}
          onValueChange={(value) => {
            const brand = pick(BRAND_LABELS, value)
            if (brand) update({ brand })
          }}
        />
        <AppSelect
          label="Kondisi akses"
          value={c.accessState}
          options={optionsFrom(ACCESS_STATE_LABELS)}
          onValueChange={(value) => {
            const accessState = pick(ACCESS_STATE_LABELS, value)
            if (accessState) update({ accessState })
          }}
        />
        <AppSelect
          label="Status backup"
          value={c.backupStatus}
          options={optionsFrom(BACKUP_STATUS_LABELS)}
          onValueChange={(value) => {
            const backupStatus = pick(BACKUP_STATUS_LABELS, value)
            if (backupStatus) update({ backupStatus })
          }}
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <TextField
            label="Model perangkat"
            placeholder="Kosong = belum diketahui"
            value={modelDraft}
            maxLength={64}
            onChange={(event) => setModelDraft(event.target.value)}
            onBlur={commitModel}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitModel()
            }}
            error={modelError}
            hint={
              c.modelSource === 'detected'
                ? 'Sumber: perangkat terdeteksi'
                : c.modelSource === 'reported'
                  ? 'Sumber: dari teknisi'
                  : 'Belum diketahui'
            }
          />
          {liveModel && c.modelSource !== 'detected' ? (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              icon={<Smartphone aria-hidden className="size-4" />}
              onClick={() => {
                setModelDraft(liveModel)
                update({ model: liveModel, modelSource: 'detected' })
              }}
            >
              Pakai perangkat terdeteksi
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 max-w-[760px]">
        <AppSwitch
          label="Saya menangani perangkat ini dengan izin pemilik"
          description={
            c.ownerAuthorizedAt
              ? `Dicatat ${new Date(c.ownerAuthorizedAt).toLocaleString('id-ID')}. Terpisah dari persetujuan reset; identitas pemilik tidak disimpan.`
              : 'Otorisasi umum, terpisah dari persetujuan reset. Identitas pemilik tidak disimpan.'
          }
          checked={c.ownerAuthorizationConfirmed}
          onCheckedChange={(checked) => update({ ownerAuthorizationConfirmed: checked })}
        />
      </div>
    </Panel>
  )
}
