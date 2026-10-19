/**
 * Fetch the open-source datasets dsh-english-learn builds its vocabulary from.
 *
 * Sources (all permissively licensed; see NOTICE.md):
 *   - CET word lists   public     the deck's word list, IPA and exam senses
 *   - ECDICT           MIT        gloss fallback, frequency, collocations
 *   - ipa-dict         MIT        British-English IPA (primary pronunciation)
 *   - Tatoeba cmn-eng  CC-BY 2.0  human-translated English/Chinese example pairs
 *   - OpenCC           Apache-2.0 traditional -> simplified conversion for Tatoeba
 *
 * Downloads land in the cache directory and are reused on later runs, so
 * `pipeline.mjs` can be re-run offline once the cache is warm.
 * @module dsh-english-learn/scripts/sources
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { createGunzip, gunzipSync, inflateRawSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Repository root, derived from this file's location.
 *
 * The download cache lives *outside* the package (one level up) so a checkout
 * does not carry ~240 MB of upstream data. Resolving paths relatively is what
 * lets these scripts run from any checkout location.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(HERE, '..')

/** Download cache directory. Override with `DSH_ENGLISH_LEARN_CACHE`. */
export const CACHE = process.env.DSH_ENGLISH_LEARN_CACHE ?? resolve(ROOT, '..', '.data-cache')

/** Pinned revisions so a rebuild reproduces the same data. */
export const SOURCES = {
  // The npm registry tarball is the same MIT dataset as the GitHub repo and is
  // reachable from environments where raw.githubusercontent.com is not.
  ecdict: 'https://registry.npmjs.org/ecdict/-/ecdict-0.0.4.tgz',
  ipaUk: 'https://cdn.jsdelivr.net/gh/open-dict-data/ipa-dict@master/data/en_UK.txt',
  tatoeba: 'https://www.manythings.org/anki/cmn-eng.zip',
  opencc: 'https://registry.npmjs.org/opencc-js/-/opencc-js-1.4.2.tgz',
  // A large English-only corpus, used only to prove a collocation is real
  // English. downloads.tatoeba.org serves the same data but is throttled to a
  // few KB/s here, so the OPUS mirror is used instead.
  corpus: 'https://object.pouta.csc.fi/OPUS-Tatoeba/v2023-04-12/mono/en.txt.gz',
  // The published 大学英语四级/六级大纲单词表: the deck's word list, and the
  // source of IPA and a Chinese gloss for words ipa-dict or ECDICT lack.
  cet4: 'https://cdn.jsdelivr.net/gh/mahavivo/english-wordlists@master/CET4_edited.txt',
  cet6: 'https://cdn.jsdelivr.net/gh/mahavivo/english-wordlists@master/CET6_edited.txt',
}

/**
 * Sentences read from the attestation corpus before stopping.
 *
 * The corpus exists to answer "does a human ever write this phrase?", which
 * ~300k conversational sentences answer as well as 2M do. Bounding the read
 * keeps a rebuild to about a minute instead of a 20 MB download.
 */
const CORPUS_SENTENCE_BUDGET = 300000

/**
 * Local, optional attestation corpus.
 *
 * When `eng_sentences.tsv` is present (the decompressed Tatoeba English export)
 * it is read instead of streaming OPUS, which is both faster and offline. The
 * OPUS stream stays as the fallback so a clean checkout still builds.
 */
export async function hasLocalCorpus() {
  try {
    return (await stat(`${CACHE}/eng_sentences.tsv`)).size > 1024
  } catch {
    return false
  }
}

/**
 * Feed every sentence of the local Tatoeba English export to `onSentence`.
 * @param {(sentence: string) => void} onSentence - called once per sentence.
 * @returns {Promise<number>} how many sentences were read.
 */
export async function readLocalCorpus(onSentence) {
  const text = await readFile(`${CACHE}/eng_sentences.tsv`, 'utf8')
  let count = 0
  for (const line of text.split('\n')) {
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const sentence = parts.slice(2).join('\t').trim()
    if (sentence === '') continue
    onSentence(sentence)
    count += 1
  }
  return count
}

/** Download `url` to the cache unless it is already there. */
async function fetchCached(url, file) {
  await mkdir(CACHE, { recursive: true })
  const path = `${CACHE}/${file}`
  try {
    const existing = await readFile(path)
    if (existing.length > 1024) return existing
  } catch { /* not cached yet */ }
  const response = await fetch(url, { signal: AbortSignal.timeout(900000), redirect: 'follow' })
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(path, buffer)
  return buffer
}

/** Walk a tar buffer into `{ name, data }` entries. */
function untar(tar) {
  const out = new Map()
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) break
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '')
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim(), 8) || 0
    const type = String.fromCharCode(header[156])
    if (type === '0' && size > 0) out.set(name.replace(/^package\//, ''), tar.subarray(offset + 512, offset + 512 + size))
    offset += 512 + Math.ceil(size / 512) * 512
  }
  return out
}

/** Extract every entry of a zip buffer (stored or deflate). */
function unzip(zip) {
  const out = new Map()
  const eocdSignature = 0x06054b50
  let eocd = -1
  for (let i = zip.length - 22; i >= 0; i -= 1) {
    if (zip.readUInt32LE(i) === eocdSignature) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('zip: end-of-central-directory not found')
  const count = zip.readUInt16LE(eocd + 10)
  let cursor = zip.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i += 1) {
    const nameLength = zip.readUInt16LE(cursor + 28)
    const extraLength = zip.readUInt16LE(cursor + 30)
    const commentLength = zip.readUInt16LE(cursor + 32)
    const method = zip.readUInt16LE(cursor + 10)
    const compressedSize = zip.readUInt32LE(cursor + 20)
    const localOffset = zip.readUInt32LE(cursor + 42)
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    const localNameLength = zip.readUInt16LE(localOffset + 26)
    const localExtraLength = zip.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const raw = zip.subarray(start, start + compressedSize)
    out.set(name, method === 0 ? raw : inflateRawSync(raw))
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return out
}

/** Split one CSV line, honouring double-quoted fields. */
export function splitCsv(line) {
  const out = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') { field += '"'; i += 1 } else quoted = false
      } else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { out.push(field); field = '' }
    else field += char
  }
  out.push(field)
  return out
}

/** ECDICT as an array of field arrays, with its header. */
export async function loadEcdict() {
  const tgz = await fetchCached(SOURCES.ecdict, 'ecdict-0.0.4.tgz')
  const files = untar(gunzipSync(tgz))
  const csv = files.get('assets/ecdict.csv')
  if (csv === undefined) throw new Error('ECDICT: assets/ecdict.csv missing from the tarball')
  const lines = csv.toString('utf8').split('\n')
  const header = splitCsv(lines[0])
  return { header, lines }
}

/**
 * Normalise a pronunciation string into slash-wrapped IPA.
 *
 * Both ECDICT's `phonetic` column and the published CET lists mix conventions:
 * the schwa is written with the Cyrillic `ә`, length with `:`, and stress with
 * `'`. A CET-6 line may also carry two pronunciations (verb and noun forms);
 * only the first is kept, since a card shows one.
 * @returns {string|undefined} usable IPA, or undefined.
 */
export function normalizeIpa(raw) {
  const text = String(raw ?? '').trim()
  if (text === '') return undefined
  const first = text.split(/\s{2,}|;/)[0].trim()
  const body = first
    .replace(/ә/g, 'ə')
    .replace(/:/g, 'ː')
    .replace(/'/g, 'ˈ')
    .replace(/^\/|\/$/g, '')
    .trim()
  if (body === '' || !/[a-zæɑɒɔəɜɪʊʌeiou]/.test(body)) return undefined
  return '/' + body + '/'
}

/**
 * Parse one line of a published CET word list.
 *
 * CET-4 lines read `abandon [əˈbændən] vt.丢弃；放弃，抛弃`; CET-6 lines read
 * `abandon [əˈbændən] v. 1. 抛弃，放弃 2. …`. The headword must start the line
 * and be at least two letters, which is what stops a bare section header (`A`)
 * being read as a word and swallowing the next entry's tail.
 * @returns {{word: string, ipa: string, gloss: string}|undefined}
 */
function parseCetLine(line) {
  const match = /^([a-zA-Z][a-zA-Z'’-]{1,30}?)(?:\s*\[([^\]]*)\])?\s+(.*)$/.exec(line)
  if (match === null) return undefined
  const word = match[1].trim().toLowerCase()
  if (!/^[a-z][a-z'’-]*$/.test(word)) return undefined
  return { word, ipa: (match[2] ?? '').trim(), gloss: (match[3] ?? '').trim() }
}

/**
 * Load a published CET word list as `Map<word, {ipa, gloss}>`.
 *
 * This list is the deck's spine. It carries the word, its pronunciation and its
 * Chinese meaning on one line, so it also backstops the ~1% of words that
 * ipa-dict does not cover.
 * @param {'cet4'|'cet6'} level - which list to load.
 */
export async function loadCetList(level) {
  const text = (await fetchCached(SOURCES[level], `${level}-wordlist.txt`)).toString('utf8')
  const map = new Map()
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    const parsed = parseCetLine(line)
    if (parsed === undefined) continue
    if (!map.has(parsed.word)) map.set(parsed.word, { ipa: parsed.ipa, gloss: parsed.gloss })
  }
  return map
}

/** ipa-dict British English as `Map<word, ipa>`. */
export async function loadIpa() {
  const text = (await fetchCached(SOURCES.ipaUk, 'en_UK.txt')).toString('utf8')
  const map = new Map()
  for (const line of text.split('\n')) {
    const tab = line.indexOf('\t')
    if (tab <= 0) continue
    const word = line.slice(0, tab).trim().toLowerCase()
    if (word === '' || map.has(word)) continue
    const value = line.slice(tab + 1).split(',')[0].trim()
    if (value !== '') map.set(word, value)
  }
  return map
}

/**
 * Chinese/English sentence pairs as `Array<[en, zh]>`.
 *
 * Two routes, best first:
 *
 *  1. The full Tatoeba link export. `cmn-eng_links` maps Chinese sentence ids to
 *     English ones and yields ~78k pairs — 2.4x the bundled archive, and the
 *     extra pairs are what let advanced vocabulary find an example at all.
 *  2. `manythings.org`'s `cmn-eng.zip`, a 32k-pair conversational subset that
 *     reaches only ~6.7k distinct words. Used as a fallback so the pipeline
 *     still runs without the larger download.
 *
 * The link route needs three decompressed TSVs in the cache; see README.md for
 * the one-line command that produces them.
 */
export async function loadTatoeba() {
  const linkPath = `${CACHE}/cmn-eng_links.tsv`
  const cmnPath = `${CACHE}/cmn_sentences.tsv`
  const engPath = `${CACHE}/eng_sentences.tsv`
  try {
    const [links, cmn, eng] = await Promise.all([
      readFile(linkPath, 'utf8'),
      readFile(cmnPath, 'utf8'),
      readFile(engPath, 'utf8'),
    ])
    const rows = joinPairs(links, cmn, eng)
    if (rows.length > 0) return rows
  } catch {
    // Fall through to the bundled archive.
  }
  return loadTatoebaArchive()
}

/**
 * Join the Tatoeba link table against both sentence tables.
 * @returns {Array<[string, string]>} English/Chinese pairs.
 */
function joinPairs(links, cmn, eng) {
  // Both sentence files are `id \t lang \t text`.
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
  const rows = []
  for (const line of links.split('\n')) {
    const parts = line.split('\t')
    if (parts.length < 2) continue
    const zh = cmnById.get(parts[0].trim())
    const en = engById.get(parts[1].trim())
    if (zh === undefined || en === undefined) continue
    rows.push([en, zh])
  }
  return rows
}

/** The 32k-pair conversational subset bundled by manythings.org. */
async function loadTatoebaArchive() {
  const zip = await fetchCached(SOURCES.tatoeba, 'cmn-eng.zip')
  const files = unzip(zip)
  const entry = [...files].find(([name]) => name.endsWith('.txt') && !name.startsWith('_'))
  if (entry === undefined) throw new Error('Tatoeba: no sentence file in the archive')
  const rows = []
  for (const line of entry[1].toString('utf8').split('\n')) {
    const parts = line.split('\t')
    if (parts.length < 2) continue
    const en = parts[0].trim()
    const zh = parts[1].trim()
    if (en === '' || zh === '') continue
    rows.push([en, zh])
  }
  return rows
}

/**
 * Stream English sentences out of the gzipped OPUS corpus.
 *
 * The response is piped through gunzip and read line by line, so only the first
 * {@link CORPUS_SENTENCE_BUDGET} sentences are transferred and decompressed; the
 * connection is then cancelled rather than downloading the remaining ~20 MB.
 * @param {(sentence: string) => void} onSentence - called once per sentence.
 * @returns {Promise<number>} how many sentences were read.
 */
export async function streamCorpus(onSentence) {
  const response = await fetch(SOURCES.corpus, { signal: AbortSignal.timeout(600000) })
  if (response.ok !== true || response.body === null) {
    throw new Error(`corpus: HTTP ${response.status}`)
  }
  const gunzip = createGunzip()
  const source = Readable.fromWeb(response.body)
  source.pipe(gunzip)

  let count = 0
  let carry = ''
  try {
    for await (const chunk of gunzip) {
      carry += chunk.toString('utf8')
      let newline = carry.indexOf('\n')
      while (newline >= 0) {
        const line = carry.slice(0, newline).trim()
        carry = carry.slice(newline + 1)
        if (line !== '') {
          onSentence(line)
          count += 1
        }
        if (count >= CORPUS_SENTENCE_BUDGET) return count
        newline = carry.indexOf('\n')
      }
    }
  } finally {
    // Stop the download once the budget is met; the rest is not needed.
    source.destroy()
    gunzip.destroy()
  }
  return count
}

/**
 * OpenCC traditional -> simplified converter.
 *
 * The Tatoeba Chinese half mixes both scripts; the UI is simplified-only, so
 * every sentence is normalised. The self-contained `dist/esm/t2cn.js` bundle is
 * used rather than the `esm-lib` module tree: it needs no relative imports and
 * exposes the simple `Converter({ from, to })` factory.
 */
export async function loadConverter() {
  const tgz = await fetchCached(SOURCES.opencc, 'opencc-js-1.4.2.tgz')
  const files = untar(gunzipSync(tgz))
  const bundle = files.get('dist/esm/t2cn.js')
  if (bundle === undefined) throw new Error('OpenCC: dist/esm/t2cn.js missing from the tarball')
  const root = CACHE + '/opencc'
  await mkdir(root, { recursive: true })
  const path = root + '/t2cn.mjs'
  await writeFile(path, bundle)
  const module = await import('file:///' + path)
  const opencc = module.default ?? module
  if (typeof opencc.Converter !== 'function') {
    throw new Error('OpenCC: the t2cn bundle did not expose Converter()')
  }
  return opencc.Converter({ from: 'tw', to: 'cn' })
}
