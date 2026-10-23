// Menjalankan Tauri CLI (`npm run tauri ...`).
//
// Terminal yang dibuka sebelum Rust dipasang (mis. VS Code yang sudah berjalan) belum memuat
// PATH baru, sehingga `cargo` tidak ditemukan. Bila lokasi default rustup ada tetapi belum
// ada di PATH, tambahkan hanya untuk proses ini — tidak mengubah PATH sistem/pengguna.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const cli = join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js')

const env = { ...process.env }
const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH'
const cargoBin = join(env.CARGO_HOME ?? join(homedir(), '.cargo'), 'bin')
const entries = (env[pathKey] ?? '').split(delimiter).filter(Boolean)

if (existsSync(cargoBin) && !entries.some((entry) => entry.toLowerCase() === cargoBin.toLowerCase())) {
  env[pathKey] = [cargoBin, ...entries].join(delimiter)
  console.log('[tauri] Rust (.cargo\\bin) belum ada di PATH terminal ini; ditambahkan untuk perintah ini saja.')
}

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], { stdio: 'inherit', env })
child.on('error', (error) => {
  console.error(`[tauri] Gagal menjalankan Tauri CLI: ${error.message}`)
  process.exit(1)
})
child.on('exit', (code) => process.exit(code ?? 1))
