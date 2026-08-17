import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const nextCli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))

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

console.warn('First Next.js build failed. Retrying once with the warmed .next cache to work around the Next.js E1068 cold-build AsyncLocalStorage issue.')

const second = runNextBuild(2)
process.exit(second.status ?? 1)
