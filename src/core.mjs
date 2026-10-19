/**
 * Framework-free core for dsh-english-learn: spaced-repetition scheduling,
 * spelling verification, quiz construction and progress statistics.
 *
 * Everything here is a pure function over plain data so the build script can
 * inline it into the browser bundle without a module graph.
 * @module dsh-english-learn/core
 */

/** Milliseconds in one day. */
export const DAY_MS = 86400000

/** Scheduler grades, ordered from worst to best recall. */
export const GRADES = ['again', 'hard', 'good', 'easy']

/** localStorage key holding the whole learner profile. */
export const STORAGE_KEY = 'dsh-english-learn/v1'

/**
 * Deterministic 32-bit PRNG (mulberry32). Quiz and option order must be
 * reproducible for a given session seed so a re-render never reshuffles the
 * answers the learner is currently looking at.
 * @param {number} seed - any 32-bit integer.
 * @returns {() => number} generator in [0, 1).
 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Case- and space-insensitive comparison form of a headword. */
export function normalizeWord(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Stable identity of one vocabulary entry across sessions and groups.
 * @param {string} groupId - owning group id.
 * @param {string} word - the headword.
 * @returns {string} key used in the progress map.
 */
export function wordKey(groupId, word) {
  return groupId + ':' + normalizeWord(word)
}

/** A fresh scheduler record for a word the learner has never seen. */
export function newProgress() {
  return {
    seen: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    lapses: 0,
    /** SM-2 ease factor; 2.5 is the neutral starting point. */
    ease: 2.5,
    /** Current interval in days; 0 means "learning, due immediately". */
    interval: 0,
    /** Epoch ms when the card next becomes due. */
    due: 0,
    /** Epoch ms of the last graded review. */
    last: 0,
  }
}

/**
 * Apply one graded review to a progress record.
 *
 * A trimmed SM-2: `again` resets the card into the learning steps (due now),
 * `hard` grows the interval slowly, `good` multiplies by the ease factor and
 * `easy` additionally boosts the ease factor.
 * @param {object} progress - current record (not mutated).
 * @param {'again'|'hard'|'good'|'easy'} grade - recall quality.
 * @param {number} now - epoch ms of the review.
 * @returns {object} the updated record.
 */
export function gradeCard(progress, grade, now) {
  const next = Object.assign({}, newProgress(), progress)
  next.seen += 1
  next.last = now
  if (grade === 'again') {
    next.wrong += 1
    next.lapses += 1
    next.streak = 0
    next.ease = Math.max(1.3, next.ease - 0.2)
    next.interval = 0
    next.due = now
    return next
  }
  next.correct += 1
  next.streak += 1
  if (grade === 'hard') {
    next.ease = Math.max(1.3, next.ease - 0.15)
    next.interval = next.interval < 1 ? 1 : next.interval * 1.2
  } else if (grade === 'good') {
    next.interval = next.interval < 1 ? 1 : next.interval * next.ease
  } else {
    next.ease = Math.min(3.2, next.ease + 0.15)
    next.interval = next.interval < 1 ? 2 : next.interval * next.ease * 1.3
  }
  // Keep intervals bounded so a long absence cannot schedule a card years out.
  next.interval = Math.min(365, Math.round(next.interval * 10) / 10)
  next.due = now + next.interval * DAY_MS
  return next
}

/**
 * Whether a word should be offered for review now.
 * @param {object|undefined} progress - the record, or undefined for a new word.
 * @param {number} now - epoch ms.
 * @returns {boolean} true when the card is due.
 */
export function isDue(progress, now) {
  if (progress === undefined || progress.seen === 0) return true
  return progress.due <= now
}

/**
 * Build the review queue: due cards first (most overdue first), then unseen
 * words, capped at `limit`.
 * @param {Array<{key: string, groupId: string, word: string}>} entries - all known words.
 * @param {Record<string, object>} progressMap - learner progress by key.
 * @param {number} now - epoch ms.
 * @param {number} limit - maximum queue length.
 * @returns {Array<object>} the ordered queue.
 */
export function buildReviewQueue(entries, progressMap, now, limit) {
  const due = []
  const fresh = []
  for (const entry of entries) {
    const progress = progressMap[entry.key]
    if (progress === undefined || progress.seen === 0) {
      fresh.push(entry)
      continue
    }
    if (progress.due <= now) due.push({ entry, overdue: now - progress.due })
  }
  due.sort((a, b) => b.overdue - a.overdue)
  const queue = due.map(item => item.entry).concat(fresh)
  return limit > 0 ? queue.slice(0, limit) : queue
}

/**
 * Count cards by scheduling state, for the dashboard.
 * @param {Array<object>} entries - all known words.
 * @param {Record<string, object>} progressMap - learner progress by key.
 * @param {number} now - epoch ms.
 * @returns {{total: number, fresh: number, due: number, learning: number, mature: number, mastered: number, accuracy: number}}
 */
export function summarize(entries, progressMap, now) {
  let fresh = 0
  let due = 0
  let learning = 0
  let mature = 0
  let mastered = 0
  let correct = 0
  let attempts = 0
  for (const entry of entries) {
    const progress = progressMap[entry.key]
    if (progress === undefined || progress.seen === 0) {
      fresh += 1
      continue
    }
    correct += progress.correct
    attempts += progress.correct + progress.wrong
    if (progress.due <= now) due += 1
    if (progress.interval >= 21) mature += 1
    else learning += 1
    if (progress.streak >= 4 && progress.interval >= 6) mastered += 1
  }
  return {
    total: entries.length,
    fresh,
    due,
    learning,
    mature,
    mastered,
    accuracy: attempts === 0 ? 0 : correct / attempts,
  }
}

/**
 * Compare a typed answer with the target word, character by character.
 *
 * Whitespace is ignored on both sides and the comparison is case-insensitive,
 * so "Ice  Cream" still matches "ice cream"; the returned marks describe the
 * learner's own keystrokes so the UI can colour them.
 * @param {string} input - what the learner typed.
 * @param {string} target - the expected headword.
 * @returns {{ok: boolean, marks: Array<{char: string, ok: boolean}>, expected: string}}
 */
export function checkSpelling(input, target) {
  const expected = normalizeWord(target)
  const typed = normalizeWord(input)
  const marks = []
  const length = Math.max(typed.length, expected.length)
  for (let i = 0; i < length; i += 1) {
    const char = typed[i] ?? ''
    marks.push({ char: char === '' ? expected[i] ?? '' : char, ok: typed[i] !== undefined && typed[i] === expected[i] })
  }
  return { ok: typed !== '' && typed === expected, marks, expected }
}

/**
 * Progressive hint for a spelling prompt: the first `revealed` characters
 * followed by underscores for the rest.
 * @param {string} word - the headword.
 * @param {number} revealed - how many leading characters to show.
 * @returns {string} the masked hint.
 */
export function maskWord(word, revealed) {
  const clean = String(word ?? '')
  let out = ''
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i]
    if (char === ' ') out += '  '
    else if (i < revealed) out += char
    else out += '_'
  }
  return out
}

/**
 * Pick `count` distinct distractor words from a pool, never including the
 * target itself.
 * @param {object} target - the correct entry.
 * @param {Array<object>} pool - candidate entries.
 * @param {number} count - how many distractors to return.
 * @param {() => number} rng - deterministic generator.
 * @returns {Array<object>} distractors.
 */
export function pickDistractors(target, pool, count, rng) {
  const chosen = []
  const seen = new Set([normalizeWord(target.word)])
  // A same-part-of-speech distractor is a fairer test than a random one, so
  // the first pass filters by pos and a second pass relaxes that filter.
  for (const pass of [true, false]) {
    if (chosen.length >= count) break
    for (const candidate of pool) {
      if (chosen.length >= count) break
      const key = normalizeWord(candidate.word)
      if (seen.has(key)) continue
      if (pass && candidate.pos !== target.pos) continue
      if (pass && normalizeWord(candidate.cn) === normalizeWord(target.cn)) continue
      seen.add(key)
      chosen.push(candidate)
    }
  }
  // Shuffle the distractors so their source order never leaks the answer.
  for (let i = chosen.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = chosen[i]
    chosen[i] = chosen[j]
    chosen[j] = tmp
  }
  return chosen.slice(0, count)
}

/**
 * Blank the headword out of an example sentence, for cloze questions.
 *
 * The inflection suffix is deliberately kept (`I ______ed a room.`) so the
 * question tests the headword rather than the tense.
 * @param {string} sentence - the English example.
 * @param {string} word - the headword to hide.
 * @returns {string|null} the sentence with a gap, or null when the word is absent.
 */
export function blankSentence(sentence, word) {
  const clean = String(sentence ?? '')
  const stem = normalizeWord(word)
  if (stem === '') return null
  // Match the headword or a simple inflected form (plural / -ed / -ing).
  const pattern = new RegExp('\\b' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es|ed|d|ing)?\\b', 'i')
  const match = pattern.exec(clean)
  if (match === null) return null
  return clean.slice(0, match.index) + '______' + (match[1] ?? '') + clean.slice(match.index + match[0].length)
}

/**
 * Build one quiz question.
 * @param {object} target - the entry being asked about.
 * @param {Array<object>} pool - the distractor pool.
 * @param {'en2cn'|'cn2en'|'cloze'} kind - question direction.
 * @param {() => number} rng - deterministic generator.
 * @returns {{kind: string, target: object, prompt: string, sub: string, options: Array<{label: string, correct: boolean}>}}
 */
export function buildQuestion(target, pool, kind, rng) {
  const distractors = pickDistractors(target, pool, 3, rng)
  if (kind === 'cloze') {
    const example = (target.examples ?? [])[0]
    const blanked = example === undefined ? null : blankSentence(example.en, target.word)
    // A word whose example cannot be blanked falls back to the meaning prompt
    // rather than showing an unanswerable question.
    if (blanked === null) return buildQuestion(target, pool, 'cn2en', rng)
    const options = [{ label: target.word, correct: true }]
      .concat(distractors.map(item => ({ label: item.word, correct: false })))
    return {
      kind: 'cloze',
      target,
      prompt: blanked,
      sub: example.cn,
      options: shuffle(options, rng),
    }
  }
  if (kind === 'cn2en') {
    const options = [{ label: target.word, correct: true }]
      .concat(distractors.map(item => ({ label: item.word, correct: false })))
    return { kind, target, prompt: target.cn, sub: target.ipa, options: shuffle(options, rng) }
  }
  const options = [{ label: target.cn, correct: true }]
    .concat(distractors.map(item => ({ label: item.cn, correct: false })))
  return { kind: 'en2cn', target, prompt: target.word, sub: target.ipa, options: shuffle(options, rng) }
}

/** Fisher-Yates shuffle returning a new array. */
export function shuffle(items, rng) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/**
 * Build a full quiz round: `count` questions drawn from `entries`, mixing the
 * three question kinds and avoiding the same target twice.
 * @param {Array<object>} entries - the words to draw from.
 * @param {Array<object>} pool - the wider distractor pool.
 * @param {number} count - number of questions.
 * @param {number} seed - deterministic seed.
 * @returns {Array<object>} the question list.
 */
export function buildQuiz(entries, pool, count, seed) {
  const rng = mulberry32(seed)
  const order = shuffle(entries, rng)
  const kinds = ['en2cn', 'cn2en', 'cloze']
  const questions = []
  for (let i = 0; i < order.length && questions.length < count; i += 1) {
    questions.push(buildQuestion(order[i], pool, kinds[i % kinds.length], rng))
  }
  return questions
}

/** Default learner settings; also the migration target for stored profiles. */
export function defaultSettings() {
  return {
    /** Words offered per review session. */
    sessionSize: 20,
    /** Speak the headword automatically when a card appears. */
    autoSpeak: true,
    /** Speech-synthesis locale, e.g. en-GB. */
    accent: 'en-GB',
    /** Hide Chinese meanings until the card is flipped. */
    hideMeaning: false,
    /**
     * Opacity of the panel's surfaces, 0.3-1.
     *
     * Only the panel's own background is faded; text keeps full opacity, so a
     * translucent panel stays readable while the chat behind it shows through.
     * 1 means fully opaque, which is the default because an opaque panel is the
     * safest starting point and translucency is a deliberate opt-in.
     */
    opacity: 1,
  }
}

/** A brand-new learner profile. */
export function defaultState() {
  return {
    v: 1,
    settings: defaultSettings(),
    progress: {},
    /** Completed activity log, newest last, capped by `logActivity`. */
    log: [],
    /** Words the learner starred for extra drilling. */
    starred: {},
    /** Last surface the learner had open, so the panel reopens where it left off. */
    ui: { tab: 'learn', groupId: null },
  }
}

/** Lowest opacity the panel accepts; below this the text stops being legible. */
export const MIN_OPACITY = 0.3

/**
 * Coerce a stored opacity into the supported range.
 *
 * A hand-edited or corrupted profile could carry `0`, `null` or a string; `0`
 * would make the panel invisible with no way back except clearing storage, so
 * anything unusable falls back to fully opaque rather than to the minimum.
 * @param {unknown} value - candidate opacity.
 * @returns {number} a number in [MIN_OPACITY, 1].
 */
export function normalizeOpacity(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 1
  if (number <= 0) return 1
  return Math.min(1, Math.max(MIN_OPACITY, number))
}

/**
 * Merge a stored profile over the defaults so a profile written by an older
 * version keeps working.
 * @param {unknown} stored - parsed localStorage payload.
 * @returns {object} a complete profile.
 */
export function hydrate(stored) {
  const base = defaultState()
  if (stored === null || typeof stored !== 'object') return base
  const value = /** @type {Record<string, any>} */ (stored)
  const merged = Object.assign(base, value)
  merged.settings = Object.assign(defaultSettings(), value.settings ?? {})
  merged.settings.opacity = normalizeOpacity(merged.settings.opacity)
  if (merged.progress === null || typeof merged.progress !== 'object') merged.progress = {}
  if (merged.starred === null || typeof merged.starred !== 'object') merged.starred = {}
  if (!Array.isArray(merged.log)) merged.log = []
  if (merged.ui === null || typeof merged.ui !== 'object') merged.ui = { tab: 'learn', groupId: null }
  return merged
}

/**
 * Append one activity record, keeping the log bounded.
 * @param {Array<object>} log - existing log (not mutated).
 * @param {object} record - the activity to append.
 * @returns {Array<object>} the new log.
 */
export function logActivity(log, record) {
  const next = log.concat([record])
  return next.length > 500 ? next.slice(next.length - 500) : next
}

/** Consecutive calendar days ending today on which the learner studied. */
export function streakDays(log, now) {
  if (log.length === 0) return 0
  const days = new Set()
  for (const record of log) days.add(dayIndex(record.at))
  let streak = 0
  let cursor = dayIndex(now)
  // Today counts only once something was actually studied; otherwise the
  // streak is measured up to yesterday so it does not appear broken at dawn.
  if (!days.has(cursor)) cursor -= 1
  while (days.has(cursor)) {
    streak += 1
    cursor -= 1
  }
  return streak
}

/** Local-calendar day number for an epoch timestamp. */
export function dayIndex(at) {
  const date = new Date(at)
  return Math.floor((at - date.getTimezoneOffset() * 60000) / DAY_MS)
}

/** Human-readable interval label used on review buttons. */
export function intervalLabel(days) {
  if (days <= 0) return '<1天'
  if (days < 1) return '<1天'
  if (days < 30) return Math.round(days) + '天'
  if (days < 365) return (Math.round((days / 30) * 10) / 10) + '个月'
  return (Math.round((days / 365) * 10) / 10) + '年'
}
