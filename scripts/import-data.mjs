/**
 * Validate and prepare manually downloaded data files.
 *
 * The Tatoeba sentence exports ship as .bz2, which Node cannot decompress
 * without a native dependency, so this shells out to Python for the decompress
 * step and then verifies the result actually joins up. Run it after dropping
 * files into .data-cache/, or as a no-op when the cache is already warm.
 *
 * Usage: node scripts/import-data.mjs
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { CACHE } from './sources.mjs'

/**
 * Python interpreters to try, best first.
 *
 * Node has no bz2 decoder in its standard library, so the Tatoeba `.bz2`
 * exports need Python. The bare `python` / `python3` names come last so a
 * project-specific interpreter can be pointed at with `DSH_PYTHON` without
 * editing this file.
 */
const PYTHON_CANDIDATES = [
  process.env.DSH_PYTHON,
  'python',
  'python3',
].filter(value => typeof value === 'string' && value !== '')

/** Files the pipeline wants, and whether they are optional. */
const REQUIRED = [
  { file: 'eng_sentences.tsv.bz2', plain: 'eng_sentences.tsv', what: 'Tatoeba English sentences' },
  { file: 'cmn_sentences.tsv.bz2', plain: 'cmn_sentences.tsv', what: 'Tatoeba Chinese sentences' },
  { file: 'cmn-eng_links.tsv.bz2', plain: 'cmn-eng_links.tsv', what: 'Tatoeba zh/en link table' },
]

await mkdir(CACHE, { recursive: true })

/** Size in bytes, or 0 when the file is absent. */
async function sizeOf(path) {
  try {
    return (await stat(path)).size
  } catch {
    return 0
  }
}

/** Decompress one .bz2 with Python; returns true on success. */
function bunzip(source, target) {
  for (const python of PYTHON_CANDIDATES) {
    const result = spawnSync(python, ['-c', `
import bz2, sys
with bz2.open(sys.argv[1], 'rb') as src, open(sys.argv[2], 'wb') as dst:
    while True:
        chunk = src.read(1 << 20)
        if not chunk:
            break
        dst.write(chunk)
`, source, target], { stdio: 'ignore' })
    if (result.status === 0) return python
  }
  return undefined
}

console.log(`cache: ${CACHE}\n`)

let ready = 0
const missing = []

for (const entry of REQUIRED) {
  const source = `${CACHE}/${entry.file}`
  const target = `${CACHE}/${entry.plain}`
  const sourceSize = await sizeOf(source)
  const targetSize = await sizeOf(target)

  if (targetSize > 1024) {
    console.log(`OK       ${entry.plain}  (${(targetSize / 1048576).toFixed(1)} MB) — ${entry.what}`)
    ready += 1
    continue
  }
  if (sourceSize === 0) {
    console.log(`MISSING  ${entry.file} — ${entry.what}`)
    missing.push(entry)
    continue
  }
  process.stdout.write(`unzip    ${entry.file} (${(sourceSize / 1048576).toFixed(1)} MB)... `)
  const python = bunzip(source, target)
  if (python === undefined) {
    console.log('FAILED (no working Python with bz2 found)')
    missing.push(entry)
    continue
  }
  const resultSize = await sizeOf(target)
  console.log(`-> ${entry.plain} (${(resultSize / 1048576).toFixed(1)} MB) via ${python}`)
  ready += 1
}

/* ---------------- verify the data actually joins up ---------------- */

console.log('\nverifying the join...')
let pairs = 0
try {
  const links = await readFile(`${CACHE}/cmn-eng_links.tsv`, 'utf8')
  const cmn = await readFile(`${CACHE}/cmn_sentences.tsv`, 'utf8')
  const eng = await readFile(`${CACHE}/eng_sentences.tsv`, 'utf8')

  const readSentences = (text) => {
    const map = new Map()
    for (const line of text.split('\n')) {
      const parts = line.split('\t')
      if (parts.length < 3) continue
      const id = parts[0].trim()
      const value = parts.slice(2).join('\t').trim()
      if (id !== '' && value !== '') map.set(id, value)
    }
    return map
  }
  const cmnById = readSentences(cmn)
  const engById = readSentences(eng)
  const words = new Set()
  for (const line of links.split('\n')) {
    const parts = line.split('\t')
    if (parts.length < 2) continue
    const zh = cmnById.get(parts[0].trim())
    const en = engById.get(parts[1].trim())
    if (zh === undefined || en === undefined) continue
    pairs += 1
    const tokens = en.toLowerCase().match(/[a-z']+/g) ?? []
    if (tokens.length < 5 || tokens.length > 14) continue
    for (const token of tokens) if (token.length >= 3) words.add(token)
  }
  console.log(`  ${pairs} zh/en pairs joined`)
  console.log(`  ${words.size} distinct words reachable by an example sentence`)
  if (words.size < 12000) {
    console.log('  NOTE: coverage is still narrow; advanced groups may not fill.')
  }
} catch (error) {
  console.log(`  could not verify: ${String(error.message).slice(0, 80)}`)
}

/* ---------------- summary ---------------- */

console.log('')
if (missing.length === 0) {
  console.log('All data ready. Next:')
  console.log('  node --max-old-space-size=6144 scripts/pipeline.mjs')
} else {
  console.log(`${missing.length} file(s) still missing. Download them into ${CACHE}:`)
  for (const entry of missing) {
    console.log(`  ${entry.file}  <-  https://downloads.tatoeba.org/exports/per_language/${entry.file.startsWith('eng') ? 'eng' : 'cmn'}/${entry.file}`)
  }
  console.log('\nSee DATA.md for the full list.')
  process.exitCode = 1
}
