import { BRAND_ROWS } from '@/data/catalog'
import type { SelectOption } from '@/components/ui/AppSelect'

/** Opsi dropdown dari peta label (urutan sesuai objek label). */
export function optionsFrom<T extends string>(labels: Record<T, string>): SelectOption[] {
  return (Object.entries(labels) as Array<[T, string]>).map(([value, label]) => ({ value, label }))
}

export const BRAND_OPTIONS: SelectOption[] = BRAND_ROWS.flat().map((brand) => ({ value: brand.id, label: brand.label }))

/** Ambil nilai dropdown hanya bila termasuk enum yang diizinkan. */
export function pick<T extends string>(labels: Record<T, string>, value: string): T | null {
  return value in labels ? (value as T) : null
}
