/**
 * Build dsh-english-learn's vocabulary from open-source data.
 *
 * The deck is the published **大学英语四级/六级大纲单词表** (CET-4 / CET-6
 * syllabus word lists), not a derivation: that list is what a Chinese learner
 * actually studies for the exam, and it carries the word, its pronunciation and
 * its Chinese meaning on one line.
 *
 * Two fields are mandatory on every card, because they are what a word card is:
 *
 *   - **IPA** — ipa-dict (`en_UK`) first, then the list's own bracketed
 *     pronunciation, then ECDICT's `phonetic` column. Together these cover
 *     99.9% of CET-4 and 99.5% of CET-6.
 *   - **Chinese gloss** — ECDICT's `translation` when it yields a short clean
 *     sense, else the list's own gloss.
 *
 * Collocations and example sentences are **best-effort enrichment**: a word is
 * still emitted without them. That is the deliberate trade — a complete exam
 * word list matters more than every card being fully illustrated, and the UI
 * hides the sections a card has no data for.
 *
 * Ordering is by BNC/COCA frequency rank, so a set of 20 walks from the most
 * useful words to the least.
 *
 * Run with a raised heap: `node --max-old-space-size=6144 scripts/pipeline.mjs`.
 * @module dsh-english-learn/scripts/pipeline
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  hasLocalCorpus, loadCetList, loadConverter, loadEcdict, loadIpa, loadTatoeba,
  normalizeIpa, readLocalCorpus, splitCsv, streamCorpus, CACHE, ROOT,
} from './sources.mjs'

/** Where the generated decks land, resolved from this file so any checkout works. */
const OUT_DIR = resolve(ROOT, 'src', 'data')

/**
 * The two output decks, in study order.
 *
 * CET-6 words that also appear on the CET-4 list stay in CET-4, so the split is
 * "the base list" then "what it does not already cover".
 */
const DECKS = [
  { id: 'cet4', title: '四级核心', titleEn: 'CET-4 Core', level: 'B1', source: 'cet4' },
  { id: 'cet6', title: '六级进阶', titleEn: 'CET-6 Advanced', level: 'B2', source: 'cet6' },
]

/** Parts of speech that are grammar rather than vocabulary; never headwords. */
const FUNCTION_POS = new Set(['prep.', 'conj.', 'pron.', 'art.', 'aux.', 'int.', 'num.'])

/**
 * Highest BNC/COCA rank a word may have and still be worth studying.
 *
 * The published CET-4 list includes the closed-class core of English — `be`,
 * `of`, `and`, `in`, `to` — because an exam syllabus has to enumerate them. They
 * are not vocabulary: a learner preparing for CET-4 met them years earlier, and
 * a card for `and` teaches nothing. Cutting the top of the frequency curve
 * removes them and lets the deck open on words that are actually worth a slot.
 */
const MIN_RANK = 300

/**
 * Function words that survive the rank cut because they are frequent *and*
 * ambiguous, plus the handful the list glosses as a content word.
 */
const FUNCTION_WORDS = new Set(('be am is are was were been being do does did done have has had having ' +
  'a an the of and or but if in on at to for with by as from into over under again further then once ' +
  'here there when where why how what which who whom whose that this these those it its he she they them ' +
  'his her their our your my we you i me him us not no nor so than too very can could may might must ' +
  'shall should will would').split(/\s+/))

/** ECDICT domain labels that mark a technical or machine-translated sense. */
const NOISE_TAG = /\[(网络|医|法|计|化|经|机|电|物|数|冶|农|军|航海|建|纺|印|心|逻|律|摄|生|药|地质|体育|航空|船舶|宗|考古|测)\]|【/

/** Longest Chinese gloss a card will show. */
const MAX_GLOSS = 16

/** ECDICT part-of-speech markers mapped onto the abbreviations the UI shows. */
const POS_MAP = [
  [/^(n|noun)\.?$/i, 'n.'],
  [/^(v|vt|vi|verb)\.?$/i, 'v.'],
  [/^(a|adj|adjective)\.?$/i, 'adj.'],
  [/^(ad|adv|adverb)\.?$/i, 'adv.'],
]

/** Normalise an ECDICT pos marker; undefined when it is not one we display. */
function normalisePos(marker) {
  const clean = String(marker ?? '').trim()
  for (const [pattern, value] of POS_MAP) if (pattern.test(clean)) return value
  return undefined
}

/**
 * Parse every usable sense out of one ECDICT `translation` cell.
 *
 * ECDICT packs several senses into the cell separated by a **literal
 * backslash-n** (`"vt. 放弃\nn. 放任"`), not a real newline — the CSV contains
 * zero 0x0A bytes inside this column. Splitting on '\n' therefore never splits,
 * and a domain-tagged sense anywhere in the cell (`[医] 失神`) poisons the whole
 * gloss. That single mistake rejected 2,114 of 3,837 CET-4 words.
 *
 * Domain-tagged senses are dropped rather than allowed to spoil their
 * neighbours, and all usable senses are returned so the caller can pick the one
 * its collocations can support.
 * @returns {Array<{pos: string, cn: string}>} usable senses, best first.
 */
function parseGlosses(translation) {
  const out = []
  for (const line of String(translation ?? '').split(/\\n|\n/)) {
    const text = line.trim()
    if (text === '' || NOISE_TAG.test(text)) continue
    const match = /^([a-z]{1,5})\.\s*/i.exec(text)
    let pos
    let body = text
    if (match !== null) {
      pos = normalisePos(match[1])
      if (pos !== undefined) body = text.slice(match[0].length)
    }
    const senses = body
      .split(/[,，;；]/)
      .map(sense => sense.trim().replace(/^[（(][^）)]*[）)]\s*/, '').trim())
      .filter(sense => sense !== '' && !NOISE_TAG.test(sense))
    if (senses.length === 0) continue
    const gloss = senses.slice(0, 2).join('；')
    if (gloss.length < 1 || gloss.length > MAX_GLOSS) continue
    if (/[a-zA-Z]{2,}/.test(gloss)) continue
    if (!/[\u4e00-\u9fff]/.test(gloss)) continue
    const resolved = pos ?? 'n.'
    if (FUNCTION_POS.has(resolved)) continue
    out.push({ pos: resolved, cn: gloss })
  }
  return out
}

/**
 * Parse the published list's own gloss into a short card line.
 *
 * The list writes numbered senses (`v. 1. 抛弃，放弃 2. 离弃…`) and marks the
 * part of speech with `vt.` / `adj.` / `ad.`. Only the first sense is kept so the
 * card stays one line.
 * @returns {{pos: string, cn: string}|undefined}
 */
function parseListGloss(gloss) {
  let text = String(gloss ?? '').trim()
  if (text === '') return undefined
  // A collocation hint may follow the senses after `||`.
  text = text.split('||')[0].trim()
  // The list abbreviates adverbs as `d.` (and adjectives as `a.`), which the
  // shared pos map does not know. Normalise those before anything else, or the
  // marker survives into the gloss as `d.或许，大概`.
  text = text.replace(/^d\.\s*/, 'adv. ').replace(/^a\.\s*/, 'adj. ')
  const posMatch = /^(vt|vi|v|n|adj|adv|prep|conj|pron|num|art|int)\.?\s*/i.exec(text)
  let pos = 'n.'
  if (posMatch !== null) {
    pos = normalisePos(posMatch[1]) ?? 'n.'
    text = text.slice(posMatch[0].length)
  }
  // Drop the sense numbering, then keep the first sense.
  text = text.replace(/^\d+[.、]\s*/, '')
  let first = text.split(/\s*\d+[.、]\s*/)[0].split(/[;；]/)[0].trim()
  // The list often embeds a second part of speech mid-gloss — `欧洲的 n.欧洲人`
  // or `vt. 需要 aux.必须`. Only the first sense is wanted, so cut at the marker.
  first = first.split(/\s+(?:vt|vi|v|n|adj|a|ad|adv|prep|conj|pron|num|art|int)\.\s*/)[0].trim()
  const cn = first.replace(/[（(][^）)]*[）)]/g, '').trim()
  if (cn.length < 1 || cn.length > MAX_GLOSS) return undefined
  if (/[a-zA-Z]{2,}/.test(cn)) return undefined
  if (!/[\u4e00-\u9fff]/.test(cn)) return undefined
  return { pos, cn }
}

/** Parse ECDICT's `exchange` cell into inflected forms of the headword. */
function parseForms(exchange) {
  const forms = []
  for (const part of String(exchange ?? '').split('/')) {
    const colon = part.indexOf(':')
    if (colon <= 0) continue
    const value = part.slice(colon + 1).trim()
    if (value !== '' && /^[a-z' -]+$/i.test(value)) forms.push(value.toLowerCase())
  }
  return forms
}

/* ------------------------------------------------------------------ *
 * Enrichment scoring (best-effort, never blocking)
 * ------------------------------------------------------------------ */

/** Chinese function characters that carry no meaning of their own. */
const GLOSS_STOP_CHARS = new Set('的地得着了是在有和与及或而也都就才很太更最不没无一二三个些这那之其以为于把被让使从到向对给用做作能会要可应该各种类事物人们上下前后里外中间时候方面'.split(''))

/** Content characters of a Chinese gloss, function words removed. */
function contentChars(gloss) {
  const out = new Set()
  for (const char of String(gloss ?? '').replace(/[^\u4e00-\u9fff]/g, '')) {
    if (!GLOSS_STOP_CHARS.has(char)) out.add(char)
  }
  return out
}

/**
 * Whether a Chinese gloss relates to the sense being taught.
 *
 * Comparing glosses naively is useless — nearly every adjective ends in 的 — so
 * only content characters count. This is what stops `flat` (平坦的) being
 * "illustrated" by 我的房子.
 */
function relatesToGloss(glossCn, candidateCn) {
  const headwordChars = contentChars(glossCn)
  if (headwordChars.size === 0) return true
  for (const char of contentChars(candidateCn)) {
    if (headwordChars.has(char)) return true
  }
  return false
}

/** Words common enough that seeing them in a phrase is not itself remarkable. */
const COMMON = new Set(('a an the of in on at to for with up out from into about by as and or be is are was were ' +
  'it its that this these those your his her their our my one two not no do does did done make makes made taking ' +
  'take get got have has had go going come came put give keep set look turn run play pay hold break bring call ' +
  'carry catch cut draw drive fall feel find follow hear help leave let live meet move pass pick pull push read ' +
  'ride rise see sell send show sit speak stand start stay stop talk tell think throw try walk watch wear win ' +
  'work write well good bad big small high low long short new old great little own same right left full hard ' +
  'easy free open close sure real true best more most very much many all any some each every other such only ' +
  'just also too now then here there when where why how what who which').split(/\s+/))

/** How unremarkable one token of a phrase is; higher is better. */
function commonness(token, index) {
  if (COMMON.has(token)) return 3
  const entry = index.get(token)
  if (entry === undefined) return 0
  if (entry.rank > 0) return 2
  if (entry.tag !== '') return 1
  return 0
}

/**
 * Normalise a sentence for duplicate detection.
 *
 * Tatoeba holds the same sentence with and without a contraction (`We are
 * traveling…` / `We're traveling…`), and showing both on one card wastes a slot.
 * Expanding contractions and stripping punctuation makes those compare equal.
 */
function sentenceFingerprint(sentence) {
  return String(sentence)
    .toLowerCase()
    // Contractions must be expanded BEFORE apostrophes are stripped: doing it
    // the other way turns `we're` into `were`, which no longer matches `we are`.
    .replace(/\bwe're\b/g, 'we are')
    .replace(/\bthey're\b/g, 'they are')
    .replace(/\byou're\b/g, 'you are')
    .replace(/\bit's\b/g, 'it is')
    .replace(/\bthat's\b/g, 'that is')
    .replace(/\bthere's\b/g, 'there is')
    .replace(/\bhe's\b/g, 'he is')
    .replace(/\bshe's\b/g, 'she is')
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bdoesn't\b/g, 'does not')
    .replace(/\bdidn't\b/g, 'did not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bisn't\b/g, 'is not')
    .replace(/\baren't\b/g, 'are not')
    .replace(/\bwasn't\b/g, 'was not')
    .replace(/\bweren't\b/g, 'were not')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalise a collocation for duplicate detection.
 *
 * `our species` and `the species` are the same usage pattern with a different
 * determiner, so the determiner is dropped before comparing. Two collocations
 * that differ only in that way teach nothing extra.
 */
function phraseFingerprint(phrase) {
  return String(phrase)
    .toLowerCase()
    .split(/\s+/)
    .filter(token => !['a', 'an', 'the', 'our', 'your', 'his', 'her', 'their', 'its', 'this', 'that', 'my'].includes(token))
    .join(' ')
}

/** Reject a phrase that overlaps heavily with one already chosen. */
function tooSimilar(candidate, chosen) {
  const tokens = new Set(candidate.split(/\s+/))
  for (const other of chosen) {
    const otherTokens = new Set(other.split(/\s+/))
    let shared = 0
    for (const token of tokens) if (otherTokens.has(token)) shared += 1
    if (shared / Math.max(tokens.size, otherTokens.size) >= 0.75) return true
  }
  return false
}

/** Whole-word test for any of the word's inflected forms. */
function containsForm(sentence, forms) {
  const tokens = new Set((sentence.toLowerCase().match(/[a-z']+/g) ?? []))
  for (const form of forms) if (tokens.has(form)) return true
  return false
}

/** Sentences with a mid-sentence capital are usually names; skip those. */
function hasProperNoun(sentence) {
  const tokens = sentence.split(/\s+/)
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i].replace(/^[^A-Za-z]+/, '')
    if (token === '' || token === 'I' || /^I['’]/.test(token)) continue
    if (/^[A-Z]/.test(token)) return true
  }
  return false
}

/**
 * Words that must never reach a learner's card.
 *
 * This is a *content* filter, not a vocabulary one. `drunk`, `hell` and `die`
 * are ordinary English that a CET candidate needs, so they are not listed here;
 * what is blocked is slurs, sexual content and scatology — material that has no
 * place on a flashcard regardless of how common the word is.
 */
const BLOCKED = new Set(('asshole bastard bitch bollocks boobs cock crap cunt damn dick douche ' +
  'fag faggot fuck fucked fucking goddamn homo idiot jerk masturbate moron nigger nigga penis piss ' +
  'porn prick pussy queer retard screw sex sexy shit shitty slut stupid tits whore wtf xxx ' +
  'rape raped rapist suicide murder murdered').split(/\s+/))

/**
 * Sentence topics that are grammatical but unsuitable for a study card.
 *
 * Tatoeba is a general corpus: `period` came back as 我的月经没来 and `drunk` as a
 * drink-driving anecdote. The word is fine; those particular sentences are not
 * what a learner should rehearse.
 */
const UNSUITABLE_TOPIC = /\b(menstruat|periods?\b.*(late|missed)|pregnan|abortion|divorce|condom|naked|nude|virgin|brothel|prostitut|suicide|kill|murder|rape|drunk driving|hangover|affair|mistress|lover|gay|lesbian|breast|butt|belly|panties|bra\b|toilet|vomit|puke|diarrh|constipat)/i

/** True when the sentence contains a blocked word or an unsuitable topic. */
function hasBlockedWord(sentence) {
  if (UNSUITABLE_TOPIC.test(sentence)) return true
  for (const token of sentence.toLowerCase().match(/[a-z']+/g) ?? []) {
    if (BLOCKED.has(token)) return true
  }
  return false
}

/* ------------------------------------------------------------------ *
 * Load sources
 * ------------------------------------------------------------------ */

console.log('loading sources...')
const [{ header, lines }, ipaMap, tatoebaRows, toSimplified, cetLists] = await Promise.all([
  loadEcdict(), loadIpa(), loadTatoeba(), loadConverter(),
  Promise.all(DECKS.map(deck => loadCetList(deck.source))),
])
for (let i = 0; i < DECKS.length; i += 1) {
  console.log(`  ${DECKS[i].source} word list: ${cetLists[i].size} words`)
}
console.log(`  ecdict rows ${lines.length}, ipa entries ${ipaMap.size}, tatoeba pairs ${tatoebaRows.length}`)

const COL = {}
header.forEach((name, index) => { COL[name] = index })

/* --- pass 1: index every single-word entry ---------------------------- */
const index = new Map()
const phraseCandidates = new Map()

for (let i = 1; i < lines.length; i += 1) {
  const line = lines[i]
  if (line.length === 0) continue
  const fields = splitCsv(line)
  const original = (fields[COL.word] ?? '').trim()
  const word = original.toLowerCase()
  if (word === '' || word.length > 32) continue
  const translation = fields[COL.translation] ?? ''
  if (translation === '') continue
  const isPhrase = word.includes(' ')

  if (isPhrase) {
    for (const token of new Set(word.split(/\s+/))) {
      const list = phraseCandidates.get(token)
      const record = { word, original, translation }
      if (list === undefined) phraseCandidates.set(token, [record])
      else if (list.length < 400) list.push(record)
    }
    continue
  }
  if (!/^[a-z]{2,}$/.test(word)) continue

  const bnc = Number(fields[COL.bnc]) || 0
  const frq = Number(fields[COL.frq]) || 0
  const rank = bnc > 0 ? bnc : frq
  const existing = index.get(word)
  // Prefer the row that carries a frequency rank; it is the more complete one.
  if (existing !== undefined && existing.rank > 0 && rank === 0) continue
  index.set(word, {
    word,
    translation,
    phonetic: (fields[COL.phonetic] ?? '').trim(),
    exchange: fields[COL.exchange] ?? '',
    tag: (fields[COL.tag] ?? '').trim(),
    rank,
  })
}
console.log(`  single-word entries ${index.size}`)

/* --- pass 2: examples and collocation attestation --------------------- */
const examples = new Map()
const attested = new Set()
let converted = 0

/** Record every 2- and 3-gram of one English sentence. */
function attest(sentence) {
  const tokens = sentence.toLowerCase().match(/[a-z']+/g)
  if (tokens === null) return
  for (let i = 0; i < tokens.length; i += 1) {
    if (i + 1 < tokens.length) attested.add(tokens[i] + ' ' + tokens[i + 1])
    if (i + 2 < tokens.length) attested.add(tokens[i] + ' ' + tokens[i + 1] + ' ' + tokens[i + 2])
  }
}

for (const [en, zhRaw] of tatoebaRows) {
  const zh = toSimplified(zhRaw)
  if (zh !== zhRaw) converted += 1
  attest(en)
  const tokens = en.toLowerCase().match(/[a-z']+/g)
  if (tokens === null) continue
  for (const token of new Set(tokens)) {
    if (token.length < 3) continue
    const list = examples.get(token)
    if (list === undefined) examples.set(token, [[en, zh]])
    else if (list.length < 40) list.push([en, zh])
  }
}
console.log(`  example index ${examples.size} words (${converted} converted to simplified)`)

process.stdout.write('  reading the English corpus for collocation attestation... ')
const corpusSentences = await hasLocalCorpus() ? await readLocalCorpus(attest) : await streamCorpus(attest)
console.log(`${corpusSentences} sentences, ${attested.size} n-grams`)

/* ------------------------------------------------------------------ *
 * Build the decks
 * ------------------------------------------------------------------ */

/**
 * Pick up to two collocations for a sense, best first.
 * @returns {Array<{en: string, cn: string}>} possibly empty.
 */
function pickPhrases(entry, sense) {
  const scored = []
  for (const phrase of phraseCandidates.get(entry.word) ?? []) {
    const tokens = phrase.word.split(/\s+/)
    if (tokens.length < 2 || tokens.length > 3) continue
    const position = tokens.indexOf(entry.word)
    if (position !== 0 && position !== tokens.length - 1) continue
    let proper = false
    for (const token of phrase.original.split(/\s+/)) if (/^[A-Z]/.test(token)) proper = true
    if (proper) continue
    if (hasBlockedWord(phrase.word)) continue
    if (!attested.has(phrase.word)) continue
    const gloss = parseGlosses(phrase.translation)[0]
    if (gloss === undefined) continue
    if (gloss.cn.length < 2 || gloss.cn.length > 14) continue
    if (!relatesToGloss(sense.cn, gloss.cn)) continue
    // Every other token must be a word the learner already knows.
    let ok = true
    for (const token of tokens) {
      if (token === entry.word) continue
      if (commonness(token, index) < 3) { ok = false; break }
    }
    if (!ok) continue
    if (tokens.length === 3 && !['a', 'an', 'the', 'your', 'his', 'her', 'their', 'its', 'this', 'that'].includes(tokens[1])) continue
    scored.push({ en: phrase.word, cn: gloss.cn, score: 10 + (tokens.length === 2 ? 4 : 0) })
  }
  scored.sort((a, b) => b.score - a.score)
  const out = []
  const seen = new Set()
  for (const candidate of scored) {
    if (out.length >= 2) break
    if (tooSimilar(candidate.en, out.map(item => item.en))) continue
    // Collocations differing only by a determiner are the same usage pattern.
    const print = phraseFingerprint(candidate.en)
    if (seen.has(print)) continue
    seen.add(print)
    out.push({ en: candidate.en, cn: candidate.cn })
  }
  return out
}

/**
 * Pick up to two example sentences for a sense, best first.
 * @returns {Array<{en: string, cn: string}>} possibly empty.
 */
function pickExamples(entry, sense) {
  const forms = [entry.word, ...parseForms(entry.exchange)]
  const scored = []
  for (const [en, zh] of examples.get(entry.word) ?? []) {
    const tokens = en.toLowerCase().match(/[a-z']+/g) ?? []
    if (tokens.length < 4 || tokens.length > 16) continue
    if (en.length > 92) continue
    if (zh.length < 4 || zh.length > 46) continue
    if (!/[\u4e00-\u9fff]/.test(zh)) continue
    if (/[^\x20-\x7e]/.test(en)) continue
    if (hasProperNoun(en)) continue
    if (hasBlockedWord(en)) continue
    if (!containsForm(en, forms)) continue
    // A sense mismatch is not disqualifying, but a match is worth far more.
    const coherent = relatesToGloss(sense.cn, zh)
    scored.push({ en, cn: zh, score: (coherent ? 100 : 0) + (tokens.length <= 10 ? 10 : 0) })
  }
  scored.sort((a, b) => b.score - a.score)
  const out = []
  const seen = new Set()
  for (const candidate of scored) {
    if (out.length >= 2) break
    // The same sentence with and without a contraction is one example.
    const print = sentenceFingerprint(candidate.en)
    if (seen.has(print)) continue
    seen.add(print)
    out.push({ en: candidate.en, cn: candidate.cn })
  }
  return out
}

/* --- assemble --- */
const used = new Set()
const decks = []
const stats = {
  fromDictIpa: 0, fromListIpa: 0, fromEcdictIpa: 0, noIpa: 0,
  fromEcdictGloss: 0, fromListGloss: 0, noGloss: 0,
  skippedFunction: 0, skippedTooCommon: 0,
  withPhrases: 0, withTwoPhrases: 0, withExamples: 0, withTwoExamples: 0, bare: 0,
}

for (let d = 0; d < DECKS.length; d += 1) {
  const deck = DECKS[d]
  const list = cetLists[d]
  const members = []

  for (const [word, listed] of list) {
    if (used.has(word)) continue
    const entry = index.get(word)

    // Skip the closed-class core: grammar, not vocabulary.
    if (FUNCTION_WORDS.has(word)) { stats.skippedFunction += 1; continue }
    // Skip words so frequent they cannot be new to a CET candidate. A word with
    // no rank at all is kept — it is rare, not basic.
    if (entry !== undefined && entry.rank > 0 && entry.rank < MIN_RANK) {
      stats.skippedTooCommon += 1
      continue
    }

    // --- pronunciation: ipa-dict, then the list, then ECDICT ---
    let ipa = ipaMap.get(word)
    if (ipa !== undefined) stats.fromDictIpa += 1
    else {
      ipa = normalizeIpa(listed.ipa)
      if (ipa !== undefined) stats.fromListIpa += 1
      else {
        ipa = normalizeIpa(entry?.phonetic)
        if (ipa !== undefined) stats.fromEcdictIpa += 1
      }
    }
    if (ipa === undefined) { stats.noIpa += 1; continue }

    // --- gloss: ECDICT's short sense first, else the list's own ---
    //
    // ECDICT lists senses in its own order, which is not the order a learner
    // needs: `in` comes back as 执政者；交情 (a noun sense) because the noun line
    // happens to be first. The published list writes the *exam* sense first, so
    // when both exist the list's sense is preferred and ECDICT supplies only the
    // fallback plus the part of speech.
    const senses = entry === undefined ? [] : parseGlosses(entry.translation)
    const listed_ = parseListGloss(listed.gloss)
    const base = listed_ ?? senses[0]
    if (base === undefined) { stats.noGloss += 1; continue }
    if (listed_ !== undefined) stats.fromListGloss += 1
    else stats.fromEcdictGloss += 1

    // --- enrichment, best effort; never a reason to drop the word ---
    // Candidate senses include both sources, so a collocation can be matched
    // against whichever sense the card ended up showing.
    const candidateSenses = []
    if (base !== undefined) candidateSenses.push(base)
    for (const sense of senses) {
      if (!candidateSenses.some(s => s.cn === sense.cn)) candidateSenses.push(sense)
    }
    let best = { sense: base, phrases: [], examples: [] }
    if (entry !== undefined) {
      let bestScore = -1
      for (const sense of candidateSenses) {
        const phrases = pickPhrases(entry, sense)
        const picked = pickExamples(entry, sense)
        // Weight the card's own sense heavily so enrichment cannot pull the
        // card onto a different meaning.
        const score = (sense.cn === base.cn ? 100 : 0) + phrases.length * 10 + picked.length
        if (score > bestScore) {
          bestScore = score
          best = { sense, phrases, examples: picked }
        }
      }
    }

    members.push({
      w: word,
      ipa,
      pos: best.sense.pos,
      cn: best.sense.cn,
      phrases: best.phrases,
      examples: best.examples,
      rank: entry?.rank ?? 0,
    })
    used.add(word)

    if (best.phrases.length > 0) stats.withPhrases += 1
    if (best.phrases.length >= 2) stats.withTwoPhrases += 1
    if (best.examples.length > 0) stats.withExamples += 1
    if (best.examples.length >= 2) stats.withTwoExamples += 1
    if (best.phrases.length === 0 && best.examples.length === 0) stats.bare += 1
  }

  // Frequency order, so a set walks from the most useful words to the least.
  members.sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9))
  decks.push({ deck, members })
  console.log(`  ${deck.id}: ${members.length} words`)
}

/* --- write ------------------------------------------------------------- */
// Clear stale decks first: a previous run may have used different ids, and a
// leftover file would silently become an extra group in the deck.
await mkdir(OUT_DIR, { recursive: true })
for (const stale of await readdir(OUT_DIR)) {
  if (stale.endsWith('.json')) await rm(`${OUT_DIR}/${stale}`)
}

for (let i = 0; i < decks.length; i += 1) {
  const { deck, members } = decks[i]
  const name = `${String(i + 1).padStart(2, '0')}-${deck.id}.json`
  await writeFile(`${OUT_DIR}/${name}`, JSON.stringify({
    id: deck.id,
    title: deck.title,
    titleEn: deck.titleEn,
    level: deck.level,
    words: members.map(({ rank, ...rest }) => rest),
  }, null, 2) + '\n', 'utf8')
  console.log(`wrote src/data/${name}`)
}

const total = decks.reduce((sum, d) => sum + d.members.length, 0)
console.log(`\n${total} words across ${decks.length} decks (${Math.ceil(total / 20)} sets of 20)`)
console.log('\npronunciation source:')
console.log(`  ipa-dict (en_UK)   : ${stats.fromDictIpa}`)
console.log(`  the CET list itself: ${stats.fromListIpa}`)
console.log(`  ECDICT phonetic    : ${stats.fromEcdictIpa}`)
console.log(`  dropped, no IPA    : ${stats.noIpa}`)
console.log('\ngloss source:')
console.log(`  the CET list itself: ${stats.fromListGloss}`)
console.log(`  ECDICT short sense : ${stats.fromEcdictGloss}`)
console.log(`  dropped, no gloss  : ${stats.noGloss}`)
console.log('\nskipped as grammar rather than vocabulary:')
console.log(`  closed-class words : ${stats.skippedFunction}`)
console.log(`  rank below ${MIN_RANK}      : ${stats.skippedTooCommon}`)
console.log('\nenrichment (best effort, never required):')
console.log(`  with 1+ collocation: ${stats.withPhrases}`)
console.log(`  with 2 collocations: ${stats.withTwoPhrases}`)
console.log(`  with 1+ example    : ${stats.withExamples}`)
console.log(`  with 2 examples    : ${stats.withTwoExamples}`)
console.log(`  bare (ipa+gloss)   : ${stats.bare}`)
