import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const candidates = [
  path.join(root, 'node_modules/next/dist/esm/lib/metadata/resolve-metadata.js'),
  path.join(root, 'node_modules/next/dist/lib/metadata/resolve-metadata.js'),
]

function patchFile(file) {
  if (!fs.existsSync(file)) return { file, status: 'missing' }

  const original = fs.readFileSync(file, 'utf8')
  const fnIndex = original.indexOf('async function resolveMetadata(')
  if (fnIndex === -1) return { file, status: 'function-not-found' }

  const bodyEnd = original.indexOf('\n}', fnIndex)
  const scope = bodyEnd === -1 ? original.slice(fnIndex) : original.slice(fnIndex, bodyEnd + 2)
  const metadataIndex = scope.indexOf('const metadataItems = await resolveMetadataItems(')
  const workStoreMatch = scope.match(/\n([ \t]*)const workStore = ([^\n;]*workAsyncStorage[^\n;]*getStore\(\))\s*;?/)

  if (metadataIndex === -1 || !workStoreMatch) {
    return { file, status: 'pattern-not-found' }
  }

  const workStoreIndex = workStoreMatch.index ?? -1
  if (workStoreIndex >= 0 && workStoreIndex < metadataIndex) {
    return { file, status: 'already-patched' }
  }

  const absoluteWorkStart = fnIndex + workStoreIndex
  const absoluteWorkEnd = absoluteWorkStart + workStoreMatch[0].length
  const indent = workStoreMatch[1]
  const expression = workStoreMatch[2]

  let patched = original.slice(0, absoluteWorkStart) + original.slice(absoluteWorkEnd)
  const absoluteMetadataIndex = patched.indexOf('const metadataItems = await resolveMetadataItems(', fnIndex)
  if (absoluteMetadataIndex === -1) {
    return { file, status: 'metadata-lost' }
  }

  patched = patched.slice(0, absoluteMetadataIndex) + `const workStore = ${expression}\n${indent}` + patched.slice(absoluteMetadataIndex)
  fs.writeFileSync(file, patched)
  return { file, status: 'patched' }
}

const results = candidates.map(patchFile)
for (const result of results) {
  console.log(`[next-e1068] ${result.status}: ${path.relative(root, result.file)}`)
}

if (!results.some((result) => result.status === 'patched' || result.status === 'already-patched')) {
  console.error('[next-e1068] Could not patch the installed Next.js metadata resolver. Aborting to avoid an unreliable Bolt build.')
  process.exit(1)
}
