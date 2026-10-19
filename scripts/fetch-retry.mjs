/**
 * Download one URL with resume, retrying until it completes.
 *
 * A single attempt on a throttled link often dies mid-transfer; because
 * `fetch.mjs` resumes from the bytes already on disk, looping here turns many
 * short bursts into one complete file.
 *
 * Usage: node scripts/fetch-retry.mjs <url> <destination> [maxAttempts]
 */
import { stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const [url, destination, attemptsArg] = process.argv.slice(2)
if (url === undefined || destination === undefined) {
  console.error('usage: node scripts/fetch-retry.mjs <url> <destination> [maxAttempts]')
  process.exit(2)
}
const maxAttempts = attemptsArg === undefined ? 40 : Number(attemptsArg)

/** Bytes already downloaded, or 0. */
async function progress() {
  try {
    return (await stat(destination)).size
  } catch {
    try {
      return (await stat(destination + '.part')).size
    } catch {
      return 0
    }
  }
}

let best = 0
let stalled = 0
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const before = await progress()
  console.log(`--- attempt ${attempt}/${maxAttempts} from ${(before / 1048576).toFixed(2)} MB ---`)
  spawnSync(process.execPath, [join(here, 'fetch.mjs'), url, destination], { stdio: 'inherit' })

  const after = await progress()
  // A finished download has no `.part` sibling.
  try {
    const final = await stat(destination)
    console.log(`complete: ${destination} (${(final.size / 1048576).toFixed(1)} MB)`)
    process.exit(0)
  } catch { /* still partial */ }

  if (after > best) {
    best = after
    stalled = 0
  } else {
    stalled += 1
    console.log(`no progress (${(after / 1048576).toFixed(2)} MB); stalled ${stalled}/3`)
  }
  if (stalled >= 3) {
    console.error(`giving up after ${attempt} attempts at ${(after / 1048576).toFixed(2)} MB`)
    process.exit(1)
  }
}
console.error('attempt budget exhausted')
process.exit(1)
