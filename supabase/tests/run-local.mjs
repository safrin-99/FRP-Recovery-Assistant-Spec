// Verifikasi lokal migration + tes RLS memakai PGlite (PostgreSQL 17 WASM) dan stub auth.
// Bukan pengganti tes di project Supabase sungguhan; berguna untuk menangkap error SQL/policy.
//   npm run test:db:local
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const dir = fileURLToPath(new URL('.', import.meta.url))
const root = join(dir, '..')
const read = (path) => readFileSync(path, 'utf8')

const db = new PGlite()
try {
  await db.exec(read(join(dir, 'local-stub.sql')))
  const migrations = readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
  for (const file of migrations) {
    await db.exec(read(join(root, 'migrations', file)))
    console.log(`migration OK: ${file}`)
  }
  const results = await db.exec(read(join(dir, 'rls_recovery_cases.sql')))
  const last = results.at(-1)?.rows?.[0]
  console.log('rls tests:', last?.result ?? JSON.stringify(last))
  if (last?.result !== 'RLS_TESTS_PASSED') process.exitCode = 1
} catch (error) {
  console.error('FAILED:', error.message)
  process.exitCode = 1
} finally {
  await db.close()
}
