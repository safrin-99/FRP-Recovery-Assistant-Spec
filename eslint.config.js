import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Larangan terkait aturan proyek (CLAUDE.md / PRD §9):
//  - Tidak ada <select>/<datalist> native untuk UI pilihan yang terlihat.
//  - Frontend tidak boleh menjalankan shell/command; hanya fungsi backend allowlist.
const nativeDropdownMessage =
  'Dropdown native dilarang (PRD §9). Gunakan AppSelect atau AppCombobox dari src/components/ui.'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src-tauri/target', 'src-tauri/gen', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "JSXOpeningElement[name.name='select']", message: nativeDropdownMessage },
        { selector: "JSXOpeningElement[name.name='datalist']", message: nativeDropdownMessage },
        { selector: "JSXOpeningElement[name.name='option']", message: nativeDropdownMessage },
        {
          selector: "CallExpression[callee.property.name='createElement'][arguments.0.value=/^(select|datalist)$/]",
          message: nativeDropdownMessage,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tauri-apps/plugin-shell',
              message: 'Frontend tidak boleh menjalankan command. Gunakan fungsi backend spesifik (PRD §6).',
            },
            { name: 'child_process', message: 'Tidak ada eksekusi shell dari frontend.' },
            {
              name: '@radix-ui/react-select',
              message: 'Impor Radix Select hanya di AppSelect. Pakai <AppSelect /> agar dropdown konsisten.',
            },
          ],
        },
      ],
    },
  },
  {
    // Satu-satunya tempat yang boleh membungkus primitive Radix Select.
    files: ['src/components/ui/AppSelect.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['e2e/**/*.ts', 'scripts/**/*.mjs', 'vite.config.ts', 'playwright.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
