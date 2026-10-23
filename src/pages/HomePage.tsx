import { Search } from 'lucide-react'
import { BRAND_ROWS, METHODS } from '@/data/catalog'
import { DeviceInfoPanel } from '@/components/device/DeviceInfoPanel'
import { BrandButton } from '@/components/home/BrandButton'
import { HeroBanner } from '@/components/home/HeroBanner'
import { MethodCard } from '@/components/home/MethodCard'
import { PrimaryActionButton } from '@/components/home/PrimaryActionButton'
import { ProgressPanel } from '@/components/logs/ProgressPanel'
import { DataPreservationBanner } from '@/components/safety/DataPreservationBanner'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { useAppStore } from '@/store/appStore'

const DIAGNOSIS_UNAVAILABLE =
  'Diagnosis perangkat nyata belum tersedia pada versi ini (Milestone 2). Aktifkan Mode Demo di Settings untuk pratinjau.'

export function HomePage() {
  const method = useAppStore((s) => s.method)
  const brand = useAppStore((s) => s.brand)
  const selectMethod = useAppStore((s) => s.selectMethod)
  const selectBrand = useAppStore((s) => s.selectBrand)
  const detection = useAppStore((s) => s.detection)
  const autoDetect = useAppStore((s) => s.autoDetect)
  const run = useAppStore((s) => s.run)
  const startDiagnosis = useAppStore((s) => s.startDiagnosis)
  const cancelDiagnosis = useAppStore((s) => s.cancelDiagnosis)
  const demoAvailable = useAppStore((s) => s.demoMode && !s.liveDevice)

  return (
    <div className="flex min-h-full flex-col gap-4">
      <HeroBanner />
      <DataPreservationBanner />

      <div className="flex flex-1 gap-4 max-[1199px]:flex-col">
        <Panel aria-labelledby="method-title" className="@container flex min-w-0 flex-1 flex-col gap-3.5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="method-title" className="text-[22px] leading-tight font-semibold text-fg">
                Pilih Jalur Pemulihan
              </h2>
              <p className="mt-1 text-base text-fg-2">Pilih jalur diagnosis yang sesuai dengan perangkat Anda</p>
            </div>
            <Button
              className="h-11 border-line-strong px-4"
              icon={<Search aria-hidden className="size-5" />}
              loading={detection.status === 'detecting'}
              onClick={() => void autoDetect()}
            >
              Auto Detect
            </Button>
          </div>

          <div role="group" aria-label="Jalur pemulihan" className="grid grid-cols-2 gap-2 @[640px]:grid-cols-4">
            {METHODS.map((item) => (
              <MethodCard
                key={item.id}
                icon={item.icon}
                title={item.title}
                description={item.description}
                selected={method === item.id}
                onSelect={() => selectMethod(item.id)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 id="brand-title" className="text-lg font-semibold text-fg">
              Pilih Brand Perangkat
            </h3>
            <div role="group" aria-labelledby="brand-title" className="flex flex-col gap-2.5">
              {BRAND_ROWS.map((row, index) => (
                <div key={index} className="flex flex-wrap gap-2">
                  {row.map((item) => (
                    <BrandButton
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      selected={brand === item.id}
                      onSelect={() => selectBrand(item.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <PrimaryActionButton
              running={run.status === 'running'}
              disabled={!demoAvailable}
              disabledReason={DIAGNOSIS_UNAVAILABLE}
              onStart={startDiagnosis}
              onCancel={cancelDiagnosis}
            />
          </div>
        </Panel>

        <div className="flex w-[clamp(300px,24.8vw,381px)] shrink-0 flex-col gap-2.5 max-[1199px]:w-full">
          <DeviceInfoPanel className="min-h-[clamp(220px,25.4vh,260px)]" />
          <ProgressPanel className="min-h-[260px] flex-1" />
        </div>
      </div>
    </div>
  )
}
