/**
 * Audit the generated vocabulary for content problems a schema check misses.
 *
 * The build validator proves the shape is right; this proves the *content* is.
 * It flags vulgar or adult sentences, names, glosses that do not match the
 * example's translation, examples that do not contain the headword in the
 * taught part of speech, and other issues that make a card useless or
 * inappropriate for a learner.
 *
 * Usage: node scripts/audit.mjs
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Generated decks, resolved from this file so any checkout works. */
const DATA = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')

const BLOCKED = new Set(('asshole bastard bitch bollocks boobs cock crap cunt damn dick douche ' +
  'fag faggot fuck fucked fucking goddamn homo idiot jerk masturbate moron nigger nigga penis piss ' +
  'porn prick pussy queer retard screw sex sexy shit shitty slut stupid tits whore wtf xxx ' +
  'rape raped rapist suicide murder murdered').split(/\s+/))

const STOP_CHARS = new Set('的地得着了是在有和与及或而也都就才很太更最不没无一二三个些这那之其以为于把被让使从到向对给用做作能会要可应该各种类事物人们上下前后里外中间时候方面'.split(''))

/** Content characters only, so 的/了 cannot create a false match. */
function content(value) {
  const out = new Set()
  for (const char of String(value ?? '').replace(/[^\u4e00-\u9fff]/g, '')) {
    if (!STOP_CHARS.has(char)) out.add(char)
  }
  return out
}

function sharesContent(a, b) {
  const left = content(a)
  if (left.size === 0) return true
  for (const char of content(b)) if (left.has(char)) return true
  return false
}

/** Tokens of an English string. */
function tokens(text) {
  return String(text ?? '').toLowerCase().match(/[a-z']+/g) ?? []
}

const files = (await readdir(DATA)).filter(name => name.endsWith('.json')).sort()
const issues = []
const stats = { words: 0, phrases: 0, examples: 0, withPhrases: 0, withTwoPhrases: 0, withExamples: 0, withTwoExamples: 0, bare: 0, strictSense: 0 }

/** Record one issue. */
function flag(severity, where, message) {
  issues.push({ severity, where, message })
}

for (const file of files) {
  const group = JSON.parse(await readFile(`${DATA}/${file}`, 'utf8'))
  for (const word of group.words) {
    stats.words += 1
    const where = `${group.id}/${word.w}`
    const headword = word.w.toLowerCase()

    // --- IPA ---------------------------------------------------------
    if (!/^\/.+\/$/.test(word.ipa)) flag('error', where, `ipa not slash-wrapped: ${word.ipa}`)
    if (!/[\u0250-\u02ff\u02b0-\u02ffˈˌ]/.test(word.ipa)) {
      flag('warn', where, `ipa looks like a respelling rather than IPA: ${word.ipa}`)
    }

    // --- gloss -------------------------------------------------------
    if (!/[\u4e00-\u9fff]/.test(word.cn)) flag('error', where, `gloss is not Chinese: ${word.cn}`)
    if (word.cn.length > 18) flag('warn', where, `gloss longer than 18 chars: ${word.cn}`)
    if (!['n.', 'v.', 'adj.', 'adv.'].includes(word.pos)) {
      flag('warn', where, `unexpected pos: ${word.pos}`)
    }

    // --- phrases -----------------------------------------------------
    // Collocations are best-effort enrichment, so a missing set is not an error;
    // what matters is that whatever is present is well formed and complete.
    if (word.phrases.length > 2) flag('error', where, `${word.phrases.length} phrases, expected at most 2`)
    if (word.phrases.length > 0) stats.withPhrases += 1
    if (word.phrases.length === 2) stats.withTwoPhrases += 1
    const phraseSet = new Set()
    for (const phrase of word.phrases) {
      stats.phrases += 1
      const lower = phrase.en.toLowerCase()
      if (phraseSet.has(lower)) flag('error', where, `duplicate phrase: ${phrase.en}`)
      phraseSet.add(lower)
      // The headword must actually be in its own collocation.
      if (!lower.includes(headword)) flag('error', where, `phrase omits the headword: ${phrase.en}`)
      if (!/[\u4e00-\u9fff]/.test(phrase.cn)) flag('error', where, `phrase gloss not Chinese: ${phrase.cn}`)
      if (phrase.cn.length > 16) flag('warn', where, `phrase gloss long: ${phrase.cn}`)
      for (const token of tokens(phrase.en)) {
        if (BLOCKED.has(token)) flag('error', where, `vulgar phrase: ${phrase.en}`)
      }
      // A phrase should be a usage, not a whole sentence.
      if (tokens(phrase.en).length > 4) flag('warn', where, `phrase is very long: ${phrase.en}`)
      if (!sharesContent(word.cn, phrase.cn)) {
        flag('warn', where, `phrase sense may differ from the gloss — ${word.cn} vs ${phrase.cn}`)
      }
    }

    // --- examples ----------------------------------------------------
    if (word.examples.length > 2) flag('error', where, `${word.examples.length} examples, expected at most 2`)
    if (word.examples.length > 0) stats.withExamples += 1
    if (word.examples.length >= 2) stats.withTwoExamples += 1
    if (word.examples.length === 0 && word.phrases.length === 0) stats.bare += 1
    for (const example of word.examples) {
      stats.examples += 1
      const lower = example.en.toLowerCase()
      if (!/[\u4e00-\u9fff]/.test(example.cn)) flag('error', where, `example gloss not Chinese: ${example.cn}`)
      for (const token of tokens(example.en)) {
        if (BLOCKED.has(token)) flag('error', where, `vulgar example: ${example.en}`)
      }
      // Mid-sentence capitals are usually names, which the pipeline should drop.
      const raw = example.en.split(/\s+/)
      for (let i = 1; i < raw.length; i += 1) {
        const token = raw[i].replace(/^[^A-Za-z]+/, '')
        if (token === '' || token === 'I' || /^I['’]/.test(token)) continue
        if (/^[A-Z]/.test(token)) flag('warn', where, `possible proper noun "${token}" in: ${example.en}`)
      }
      const count = tokens(example.en).length
      if (count < 4 || count > 16) flag('warn', where, `example length ${count} words: ${example.en}`)
      // The headword or an inflection should appear.
      const hasHeadword = tokens(example.en).some(token =>
        token === headword || token.startsWith(headword) || headword.startsWith(token))
      if (!hasHeadword) flag('error', where, `example omits the headword: ${example.en}`)
      if (sharesContent(word.cn, example.cn)) stats.strictSense += 1
      else flag('warn', where, `example sense may differ from the gloss — ${word.cn} vs ${example.cn}`)
    }
  }
}

/* ---------------- report ---------------- */

const errors = issues.filter(item => item.severity === 'error')
const warnings = issues.filter(item => item.severity === 'warn')

console.log(`audited ${files.length} decks, ${stats.words} words`)
console.log(`  collocations: ${stats.phrases} (${stats.withPhrases} words have 1+, ${stats.withTwoPhrases} have 2)`)
console.log(`  examples    : ${stats.examples} (${stats.withExamples} words have 1+, ${stats.withTwoExamples} have 2)`)
console.log(`  bare cards  : ${stats.bare} (IPA + gloss only, by design)`)
console.log(`  examples whose translation shares content with the gloss: ${stats.strictSense}/${stats.examples}`)
console.log(`\n${errors.length} errors, ${warnings.length} warnings`)

if (errors.length > 0) {
  console.log('\n--- ERRORS ---')
  for (const item of errors) console.log(`  [${item.where}] ${item.message}`)
}
if (warnings.length > 0) {
  const shown = warnings.slice(0, 40)
  console.log(`\n--- WARNINGS (showing ${shown.length} of ${warnings.length}) ---`)
  console.log('    "sense may differ" is a heuristic: it compares Chinese characters, so')
  console.log('    a synonym pair with no shared character (庇护所/收容, 注视/瞪着) is a')
  console.log('    false positive. Check these by eye; the errors above are the hard ones.')
  for (const item of shown) console.log(`  [${item.where}] ${item.message}`)
}

process.exitCode = errors.length > 0 ? 1 : 0
