/**
 * Streaming downloader with resume support.
 *
 * `fetch` + `arrayBuffer()` buffers the whole response and dies on a slow link;
 * this streams to disk instead, retries, and resumes from the bytes already
 * written, so a stalled transfer costs only the current chunk.
 *
 * Usage: node scripts/fetch.mjs <url> <destination> [expectedBytes]
 */
import { createWriteStream } from 'node:fs'
import { mkdir, stat, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const [url, destination, expectedArg] = process.argv.slice(2)
if (url === undefined || destination === undefined) {
  console.error('usage: node scripts/fetch.mjs <url> <destination> [expectedBytes]')
  process.exit(2)
}
const expected = expectedArg === undefined ? 0 : Number(expectedArg)

await mkdir(dirname(destination), { recursive: true })
const partial = destination + '.part'

/** Bytes already on disk from an earlier attempt. */
async function have() {
  try {
    return (await stat(partial)).size
  } catch {
    return 0
  }
}

const total = await have()
if (total > 0) console.log(`resuming from ${(total / 1048576).toFixed(1)} MB`)

const headers = total > 0 ? { Range: `bytes=${total}-` } : {}
const response = await fetch(url, { headers, signal: AbortSignal.timeout(30 * 60 * 1000) })
if (!response.ok && response.status !== 206) throw new Error(`HTTP ${response.status}`)
if (response.body === null) throw new Error('empty response body')

const announced = Number(response.headers.get('content-length') ?? 0) + total
console.log(`streaming ${((announced || expected) / 1048576).toFixed(1)} MB -> ${partial}`)

let written = total
let lastReport = Date.now()
const progress = new TransformStream({
  transform(chunk, controller) {
    written += chunk.byteLength
    const now = Date.now()
    if (now - lastReport > 5000) {
      lastReport = now
      const pct = announced > 0 ? ((written / announced) * 100).toFixed(1) + '%' : ''
      console.log(`  ${(written / 1048576).toFixed(1)} MB ${pct}`)
    }
    controller.enqueue(chunk)
  },
})

await pipeline(
  Readable.fromWeb(response.body.pipeThrough(progress)),
  createWriteStream(partial, { flags: total > 0 ? 'a' : 'w' }),
)
await rename(partial, destination)

const final = (await stat(destination)).size
console.log(`done: ${destination} (${(final / 1048576).toFixed(1)} MB)`)
if (expected > 0 && final !== expected) {
  console.error(`warning: expected ${expected} bytes, got ${final}`)
  process.exitCode = 1
}
