import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const patchScript = fileURLToPath(new URL('./patch-next-e1068.mjs', import.meta.url))
const nextCli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))

const patch = spawnSync(process.execPath, [patchScript], {
  stdio: 'inherit',
  env: process.env,
})

if (patch.status !== 0) {
  process.exit(patch.status ?? 1)
}

function runNextBuild(attempt) {
  console.log(`Starting Next.js production build, attempt ${attempt}/2...`)
  return spawnSync(process.execPath, [nextCli, 'build', '--webpack'], {
    stdio: 'inherit',
    env: process.env,
  })
}

const first = runNextBuild(1)
if (first.status === 0) {
  process.exit(0)
}

console.warn('First Next.js build failed. Retrying once without clearing .next so transient build timing issues do not block Bolt publishing.')

const second = runNextBuild(2)
process.exit(second.status ?? 1)
