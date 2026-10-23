import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { AppCombobox } from './AppCombobox'
import { AppSelect, type SelectOption } from './AppSelect'

const OPTIONS: SelectOption[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Peringatan' },
  { value: 'locked', label: 'Terkunci', disabled: true },
  { value: 'error', label: 'Error' },
]

function ControlledSelect(props: { error?: string; disabled?: boolean; options?: SelectOption[] }) {
  const [value, setValue] = useState('info')
  return (
    <>
      <AppSelect label="Level" value={value} onValueChange={setValue} options={props.options ?? OPTIONS} {...props} />
      <output data-testid="value">{value}</output>
    </>
  )
}

function ControlledCombobox() {
  const [value, setValue] = useState('')
  return (
    <>
      <AppCombobox
        label="Kategori"
        value={value}
        onValueChange={setValue}
        options={OPTIONS}
        placeholder="Semua kategori"
        emptyMessage="Kategori tidak ditemukan."
      />
      <output data-testid="value">{value}</output>
    </>
  )
}

function expectNoVisibleNativeDropdown(container: ParentNode) {
  const natives = [...container.querySelectorAll('select, datalist')].filter(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  )
  expect(natives).toHaveLength(0)
}

describe('AppSelect', () => {
  it('renders a custom combobox trigger, not a native select', () => {
    render(<ControlledSelect />)
    const trigger = screen.getByRole('combobox', { name: 'Level' })
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveTextContent('Info')
    expectNoVisibleNativeDropdown(document)
  })

  it('opens with the keyboard, moves with arrows, and selects with Enter', async () => {
    const user = userEvent.setup()
    render(<ControlledSelect />)
    const trigger = screen.getByRole('combobox', { name: 'Level' })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expectNoVisibleNativeDropdown(document)

    await user.keyboard('{ArrowDown}{Enter}')
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('warning'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('skips disabled options during keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ControlledSelect />)
    screen.getByRole('combobox', { name: 'Level' }).focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('listbox')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('error'))
  })

  it('closes with Escape without changing the value and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<ControlledSelect />)
    const trigger = screen.getByRole('combobox', { name: 'Level' })
    await user.click(trigger)
    await screen.findByRole('listbox')
    await user.keyboard('{ArrowDown}{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(screen.getByTestId('value')).toHaveTextContent('info')
    expect(trigger).toHaveFocus()
  })

  it('exposes the error state with aria-invalid and a message', () => {
    render(<ControlledSelect error="Pilihan wajib diisi." />)
    const trigger = screen.getByRole('combobox', { name: 'Level' })
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Pilihan wajib diisi.')
    expect(trigger).toHaveAccessibleDescription('Pilihan wajib diisi.')
  })

  it('does not open when disabled', async () => {
    const user = userEvent.setup()
    render(<ControlledSelect disabled />)
    const trigger = screen.getByRole('combobox', { name: 'Level' })
    expect(trigger).toBeDisabled()
    await user.click(trigger)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no options', async () => {
    const user = userEvent.setup()
    render(<ControlledSelect options={[]} />)
    await user.click(screen.getByRole('combobox', { name: 'Level' }))
    expect(await screen.findByText('Tidak ada pilihan.')).toBeInTheDocument()
  })
})

describe('AppCombobox', () => {
  it('filters by search, shows an empty state, selects, and clears', async () => {
    const user = userEvent.setup()
    render(<ControlledCombobox />)
    const trigger = screen.getByRole('button', { name: 'Kategori' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveTextContent('Semua kategori')

    await user.click(trigger)
    const search = await screen.findByRole('combobox', { name: 'Cari Kategori' })
    expect(search.tagName).toBe('INPUT')
    expect(search).not.toHaveAttribute('list') // bukan <datalist>
    expectNoVisibleNativeDropdown(document)

    await user.type(search, 'zzz')
    expect(await screen.findByText('Kategori tidak ditemukan.')).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'Peri')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('warning'))
    expect(trigger).toHaveTextContent('Peringatan')

    await user.click(screen.getByRole('button', { name: 'Hapus pilihan Kategori' }))
    expect(screen.getByTestId('value')).toHaveTextContent('')
    expect(trigger).toHaveTextContent('Semua kategori')
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<ControlledCombobox />)
    const trigger = screen.getByRole('button', { name: 'Kategori' })
    await user.click(trigger)
    await screen.findByRole('combobox', { name: 'Cari Kategori' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Cari Kategori' })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
