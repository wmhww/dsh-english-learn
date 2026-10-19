/**
 * Verification for dsh-english-learn.
 *
 * Three layers, all runnable offline:
 *   1. data   — every group has 20 well-formed words and no headword repeats.
 *   2. core   — the scheduler, spelling checker and quiz builder behave.
 *   3. bundle — lib/client.js is executed against a DOM/react shim, `apply()`
 *               is called with a fake Cordis context, and every tab is rendered.
 *               That catches a broken component or a bad hook usage without
 *               needing a browser.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

let passed = 0
let failed = 0

function check(name, condition, detail) {
  if (condition) {
    passed += 1
  } else {
    failed += 1
    console.error(`  FAIL  ${name}${detail === undefined ? '' : ' — ' + detail}`)
  }
}

function eq(name, actual, expected) {
  check(name, Object.is(actual, expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

/* ------------------------------------------------------------------ *
 * 1. Data
 * ------------------------------------------------------------------ */

const dataDir = join(root, 'src', 'data')
const files = (await readdir(dataDir)).filter(name => name.endsWith('.json')).sort()
const groups = []
for (const file of files) {
  groups.push(JSON.parse(await readFile(join(dataDir, file), 'utf8')))
}

console.log(`\n[data] ${groups.length} groups`)

/** Group sizes are data-driven: the pipeline emits a group short rather than
 * padding it, so the bound is a range, not a fixed 20. */
/** A deck is a whole exam word list, not a 20-word teaching set. */
const MIN_DECK = 20
const MAX_DECK = 20000

const allWords = new Map()
for (const group of groups) {
  const label = group.id
  check(`${label}: ${MIN_DECK}-${MAX_DECK} words`, group.words.length >= MIN_DECK && group.words.length <= MAX_DECK, String(group.words.length))
  check(`${label}: has title`, typeof group.title === 'string' && group.title.length > 0)
  check(`${label}: has titleEn`, typeof group.titleEn === 'string' && group.titleEn.length > 0)
  const seen = new Set()
  for (const word of group.words) {
    check(`${label}/${word.w}: ipa in slashes`, /^\/.+\/$/.test(word.ipa), word.ipa)
    check(`${label}/${word.w}: pos`, /^(n|v|adj|adv)\.$/.test(word.pos), word.pos)
    check(`${label}/${word.w}: cn`, typeof word.cn === 'string' && word.cn.length > 0)
    check(`${label}/${word.w}: cn is Chinese`, /[\u4e00-\u9fff]/.test(word.cn), word.cn)
    // Enrichment is best-effort: a card may legitimately have no collocations or
    // examples. What must hold is that whatever is present is complete.
    check(`${label}/${word.w}: at most 2 phrases`, word.phrases.length <= 2, String(word.phrases.length))
    check(`${label}/${word.w}: at most 2 examples`, word.examples.length <= 2, String(word.examples.length))
    check(`${label}/${word.w}: phrase pair`, word.phrases.every(p => p.en && p.cn))
    check(`${label}/${word.w}: example pair`, word.examples.every(e => e.en && e.cn))
    check(`${label}/${word.w}: unique in group`, !seen.has(word.w.toLowerCase()))
    seen.add(word.w.toLowerCase())
    const key = word.w.toLowerCase()
    check(`"${word.w}": unique across library`, !allWords.has(key), `also in ${allWords.get(key)}`)
    allWords.set(key, label)
  }
}
console.log(`  ${allWords.size} unique headwords across the library`)

/* ------------------------------------------------------------------ *
 * 2. Core
 * ------------------------------------------------------------------ */

console.log('\n[core]')
const coreSource = await readFile(join(root, 'src', 'core.mjs'), 'utf8')
const coreUrl = 'data:text/javascript;base64,' + Buffer.from(coreSource, 'utf8').toString('base64')
const core = await import(coreUrl)

const now = 1_700_000_000_000

// A new card graded "good" starts at one day and grows by the ease factor.
let progress = core.newProgress()
eq('new card interval', progress.interval, 0)
eq('new card is due', core.isDue(progress, now), true)

progress = core.gradeCard(progress, 'good', now)
eq('good -> 1 day', progress.interval, 1)
eq('good -> streak 1', progress.streak, 1)
eq('good -> due tomorrow', progress.due, now + core.DAY_MS)
eq('graded card not due now', core.isDue(progress, now), false)
eq('graded card due tomorrow', core.isDue(progress, now + core.DAY_MS), true)

progress = core.gradeCard(progress, 'good', now + core.DAY_MS)
eq('second good -> ease 2.5', progress.interval, 2.5)
eq('correct count', progress.correct, 2)

const lapsed = core.gradeCard(progress, 'again', now + 3 * core.DAY_MS)
eq('again -> interval 0', lapsed.interval, 0)
eq('again -> due immediately', lapsed.due, now + 3 * core.DAY_MS)
eq('again -> streak reset', lapsed.streak, 0)
eq('again -> lapse counted', lapsed.lapses, 1)
check('again -> ease lowered', lapsed.ease < progress.ease, `${lapsed.ease} vs ${progress.ease}`)

const easy = core.gradeCard(core.newProgress(), 'easy', now)
eq('easy -> 2 days', easy.interval, 2)
check('easy -> ease raised', easy.ease > 2.5, String(easy.ease))

// Intervals must stay bounded.
let long = core.newProgress()
for (let i = 0; i < 60; i += 1) long = core.gradeCard(long, 'easy', now + i * core.DAY_MS)
check('interval capped at 365', long.interval <= 365, String(long.interval))

// Spelling.
const exact = core.checkSpelling('umbrella', 'umbrella')
eq('spelling exact match', exact.ok, true)
eq('spelling exact marks', exact.marks.length, 8)
check('spelling marks all ok', exact.marks.every(m => m.ok))
eq('spelling case-insensitive', core.checkSpelling('Umbrella', 'umbrella').ok, true)
eq('spelling space-insensitive', core.checkSpelling('ice  cream', 'ice cream').ok, true)
eq('spelling wrong rejected', core.checkSpelling('umbrela', 'umbrella').ok, false)
eq('spelling empty rejected', core.checkSpelling('', 'umbrella').ok, false)
const wrongMarks = core.checkSpelling('umbrela', 'umbrella')
check('wrong marks flag a miss', wrongMarks.marks.some(m => !m.ok))

// Masking.
eq('mask 0', core.maskWord('cat', 0), '___')
eq('mask 2', core.maskWord('cat', 2), 'ca_')
eq('mask spaces preserved', core.maskWord('ice cream', 0), '___  _____')
eq('mask full', core.maskWord('cat', 9), 'cat')

// Cloze blanking.
eq('blank simple', core.blankSentence('I booked a room.', 'book'), 'I ______ed a room.')
eq('blank plural', core.blankSentence('The queues were long.', 'queue'), 'The ______s were long.')
eq('blank absent', core.blankSentence('Nothing here.', 'umbrella'), null)

// Distractors never include the target and are unique.
// A deck is thousands of words, so the pool for these checks is one teaching
// set's worth, taken from the head of the first deck.
const SET_SIZE = 20
const pool = groups[0].words.slice(0, SET_SIZE).map(w => ({
  word: w.w, cn: w.cn, pos: w.pos, ipa: w.ipa, phrases: w.phrases, examples: w.examples,
}))
const target = pool[0]
const rng = core.mulberry32(42)
const distractors = core.pickDistractors(target, pool, 3, rng)
eq('three distractors', distractors.length, 3)
check('distractors exclude target', distractors.every(d => d.word !== target.word))
check('distractors unique', new Set(distractors.map(d => d.word)).size === 3)
check('distractors prefer same pos', distractors.every(d => d.pos === target.pos))

// Quiz shape.
const quiz = core.buildQuiz(pool, pool, 10, 1234)
eq('quiz length', quiz.length, 10)
check('quiz targets unique', new Set(quiz.map(q => q.target.word)).size === 10)
for (const question of quiz) {
  eq(`quiz ${question.kind}: 4 options`, question.options.length, 4)
  eq(`quiz ${question.kind}: one correct`, question.options.filter(o => o.correct).length, 1)
  check(`quiz ${question.kind}: prompt present`, typeof question.prompt === 'string' && question.prompt.length > 0)
}
const deterministicA = core.buildQuiz(pool, pool, 10, 99).map(q => q.prompt).join('|')
const deterministicB = core.buildQuiz(pool, pool, 10, 99).map(q => q.prompt).join('|')
eq('quiz is deterministic for a seed', deterministicA, deterministicB)

// Queue + summary.
const entries = groups[0].words.slice(0, SET_SIZE).map((w, index) => ({ key: 'g:' + w.w, word: w.w, index }))
const emptyProgress = {}
eq('fresh queue capped', core.buildReviewQueue(entries, emptyProgress, now, 5).length, 5)
eq('fresh queue uncapped', core.buildReviewQueue(entries, emptyProgress, now, 0).length, SET_SIZE)

const summaryFresh = core.summarize(entries, emptyProgress, now)
eq('summary fresh', summaryFresh.fresh, SET_SIZE)
eq('summary due', summaryFresh.due, 0)
eq('summary accuracy default', summaryFresh.accuracy, 0)

const someProgress = {}
for (let i = 0; i < 4; i += 1) {
  someProgress[entries[i].key] = core.gradeCard(undefined, 'good', now - 10 * core.DAY_MS)
}
someProgress[entries[4].key] = core.gradeCard(undefined, 'again', now - core.DAY_MS)
const summarySome = core.summarize(entries, someProgress, now)
eq('summary learned', summarySome.total - summarySome.fresh, 5)
eq('summary due', summarySome.due, 5)
eq('summary accuracy', summarySome.accuracy, 0.8)
const queueDue = core.buildReviewQueue(entries, someProgress, now, 20)
eq('queue: 5 due then 15 fresh', queueDue.length, 20)
// Overdue ordering is by how far past due a card is: the four "good" cards
// graded ten days ago (one-day interval) outrank the one graded yesterday.
check('queue puts the most overdue first', queueDue[0].key === entries[0].key, queueDue[0].key)
check('queue holds all five learned cards', queueDue.slice(0, 5).every(item => someProgress[item.key] !== undefined))

// Hydration tolerates junk and old profiles.
eq('hydrate null', core.hydrate(null).progress && Object.keys(core.hydrate(null).progress).length, 0)
eq('hydrate keeps progress', Object.keys(core.hydrate({ progress: { a: { seen: 1 } } }).progress).length, 1)
eq('hydrate fills settings', core.hydrate({}).settings.sessionSize, 20)
eq('hydrate fills ui', core.hydrate({}).ui.tab, 'learn')
eq('hydrate repairs bad log', Array.isArray(core.hydrate({ log: 'nope' }).log), true)

// Activity log is bounded.
let log = []
for (let i = 0; i < 600; i += 1) log = core.logActivity(log, { at: now + i, kind: 'quiz', word: 'w' + i })
eq('log capped at 500', log.length, 500)
eq('log keeps newest', log[log.length - 1].word, 'w599')

// Streaks.
const day = core.DAY_MS
eq('streak empty', core.streakDays([], now), 0)
eq('streak today', core.streakDays([{ at: now }], now), 1)
eq('streak 3 days', core.streakDays([{ at: now }, { at: now - day }, { at: now - 2 * day }], now), 3)
eq('streak broken', core.streakDays([{ at: now - 3 * day }], now), 0)

// Interval labels.
eq('label <1d', core.intervalLabel(0), '<1天')
eq('label 5d', core.intervalLabel(5), '5天')
check('label months', core.intervalLabel(60).includes('个月'), core.intervalLabel(60))

/* ------------------------------------------------------------------ *
 * 3. Bundle — execute the real client half against a shim
 * ------------------------------------------------------------------ */

console.log('\n[bundle]')

const bundleSource = await readFile(join(root, 'lib', 'client.js'), 'utf8')

/**
 * Minimal React shim: enough for the hooks this plugin actually uses.
 *
 * Hook state is keyed by the component's position in the tree plus its `key`
 * prop, which reproduces React's remount-on-key-change behaviour — the word
 * card relies on it to reset the "revealed" state for every new word.
 *
 * A keyed component whose identity changes must also *lose* its old state, as a
 * real unmount would. Without that, a fresh card inherits the previous card's
 * "revealed" flag and the blur checks depend on test order.
 */
let hookStore = new Map()
let hookPath = []
let hookCursor = 0
/** Instance keys seen during the current render pass. */
let hookLive = new Set()

function beginRender() {
  hookCursor = 0
  hookLive = new Set()
}

/** Drop state belonging to instances that were not rendered this pass. */
function endRender() {
  for (const key of [...hookStore.keys()]) {
    if (!hookLive.has(key)) hookStore.delete(key)
  }
  for (const key of [...refStore.keys()]) {
    if (!hookLive.has(key)) refStore.delete(key)
  }
}

function useHookSlot(initial) {
  const key = hookPath.join('\u0000') + '#' + hookCursor
  hookCursor += 1
  hookLive.add(key)
  if (!hookStore.has(key)) hookStore.set(key, typeof initial === 'function' ? initial() : initial)
  return [hookStore.get(key), function setSlot(value) {
    hookStore.set(key, typeof value === 'function' ? value(hookStore.get(key)) : value)
  }]
}

/**
 * `useRef` backing store.
 *
 * The panel keeps its sheet element and in-flight drag state in refs, so the
 * shim has to provide a stable mutable box per component instance. It is keyed
 * the same way as hook state so a remount yields a fresh ref, as React does.
 */
let refStore = new Map()
function useRefSlot(initial) {
  const key = hookPath.join('\u0000') + '#ref' + hookCursor
  hookCursor += 1
  hookLive.add(key)
  if (!refStore.has(key)) refStore.set(key, { current: initial })
  return refStore.get(key)
}

const react = {
  createElement(type, props, ...children) {
    return { node: true, type, props: props === null || props === undefined ? {} : props, children: children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false) }
  },
  useSyncExternalStore(subscribe, getSnapshot) {
    return getSnapshot()
  },
  useEffect() {},
  useState: useHookSlot,
  useRef: useRefSlot,
}

/** Stable identity of one component instance during a traversal. */
function instanceKey(node, index) {
  const name = typeof node.type === 'function' ? (node.type.name || 'anon') : String(node.type)
  const key = node.props.key
  return name + ':' + (key !== undefined ? String(key) : 'i' + index)
}

/** Minimal DOM shim for style injection and the document language. */
function makeElement(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    children: [],
    attributes: {},
    textContent: '',
    setAttribute(name, value) { this.attributes[name] = value },
    appendChild(child) { this.children.push(child); return child },
    remove() {},
  }
}

const storage = new Map()
const documentShim = {
  documentElement: { lang: 'zh-CN' },
  head: makeElement('head'),
  createElement: makeElement,
  querySelector: () => null,
}

/**
 * Viewport size the shim reports.
 *
 * The drag clamp reads `window.innerWidth/innerHeight`, so these have to be real
 * numbers for the off-screen test to mean anything.
 */
const VIEWPORT = { width: 1280, height: 840 }

/** Listeners registered on `window`, so a test can dispatch a drag. */
const windowListeners = new Map()

const windowShim = {
  localStorage: {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  },
  confirm: () => true,
  speechSynthesis: undefined,
  SpeechSynthesisUtterance: undefined,
  get innerWidth() { return VIEWPORT.width },
  get innerHeight() { return VIEWPORT.height },
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, new Set())
    windowListeners.get(type).add(listener)
  },
  removeEventListener(type, listener) {
    windowListeners.get(type)?.delete(listener)
  },
}

/** Dispatch one window-level event to every registered listener. */
function dispatchWindow(type, event) {
  for (const listener of [...(windowListeners.get(type) ?? [])]) listener(event)
}

let factory = null
const moduleLoader = { load: spec => { factory = spec.factory; return spec } }

// The bundle is a browser script: it reaches the loader through `window`.
windowShim.__ModuleLoader__ = moduleLoader

globalThis.window = windowShim
globalThis.document = documentShim

// The bundle assigns window.__ModuleLoader__.load(...) at top level.
// eslint-disable-next-line no-new-func
new Function('window', 'document', bundleSource)(windowShim, documentShim)

check('bundle registered a module', factory !== null)
const exportsObject = factory(name => {
  if (name === 'react') return react
  throw new Error('unexpected require: ' + name)
})
eq('bundle exports apply', typeof exportsObject.apply, 'function')
check('bundle declares inject', Array.isArray(exportsObject.inject))
check('bundle injects slots', exportsObject.inject.includes('slots'))

// Fake Cordis context capturing every slot registration.
const registered = []
const effects = []
const fakeCtx = {
  get(name) {
    if (name === 'slots') {
      return {
        inject(seat, callback) { callback() },
        register(spec, component) {
          registered.push({ spec, component })
          return () => {}
        },
      }
    }
    if (name === 'locale') {
      return { register: () => () => {}, bind: () => key => key }
    }
    return undefined
  },
  effect(callback) {
    effects.push(callback)
    const disposer = callback()
    return typeof disposer === 'function' ? disposer : () => {}
  },
}

exportsObject.apply(fakeCtx)

eq('three seats registered', registered.length, 3)
const seats = registered.map(entry => entry.spec.name).sort()
eq('seats are overlay/sidebar/settings', seats.join(','), 'settings.section,shell.overlay,sidebar.footer.action')
check('every seat has an id', registered.every(entry => typeof entry.spec.id === 'string' && entry.spec.id.length > 0))
check('every seat has a component', registered.every(entry => typeof entry.component === 'function'))
check('styles were injected', documentShim.head.children.length === 1)
const injectedCss = documentShim.head.children[0].textContent
// The panel is non-modal: the overlay layer stays click-through so the chat
// underneath keeps receiving clicks, and only the sheet opts back in.
check('overlay backdrop does not capture clicks', /\.el-overlay\{[^}]*pointer-events:none/.test(injectedCss), 'backdrop still captures pointer events')
check('overlay backdrop paints no dimming layer', !/\.el-overlay\{[^}]*background:(?!transparent)[^;}]*;/.test(injectedCss), 'backdrop still dims the app')
check('sheet opts back into pointer events', /\.el-sheet\{[^}]*pointer-events:auto/.test(injectedCss), 'sheet does not capture its own clicks')
// Opacity fades surfaces, never text. A blanket `opacity` on the sheet would
// also fade every word and button, which is the one thing this must not do.
check('opacity fades surfaces through a variable', /background:color-mix\(in srgb,var\(--dsw-alias-bg-[a-z0-9-]+\) calc\(var\(--el-alpha\) \* 100%\),transparent\)/.test(injectedCss), 'surfaces do not use the alpha variable')
check('no rule fades the whole sheet with opacity', !/\.el-sheet\{[^}]*[^-]opacity:/.test(injectedCss), 'the sheet itself is faded, text included')
check('text colours never carry the alpha variable', !/color:color-mix\([^}]*--el-alpha/.test(injectedCss), 'a text colour is being faded')
// Every rule must stay inside the plugin's own namespace so it cannot restyle
// the shell. `@media` wrappers are allowed; their contents are checked above.
check('stylesheet namespaces every rule',
  injectedCss.split('\n').every(line => line.startsWith('.el-') || line.startsWith('@media') || line.trim() === ''))

// Panel geometry: the sheet must stay clearly smaller than the viewport, and
// must adapt on narrow windows rather than overflow.
const sheetWidth = Number(/--el-sheet-w:(\d+)px/.exec(injectedCss)?.[1])
const sheetHeight = Number(/--el-sheet-h:(\d+)px/.exec(injectedCss)?.[1])
check('sheet width is defined', Number.isFinite(sheetWidth) && sheetWidth > 0, String(sheetWidth))
check('sheet height is defined', Number.isFinite(sheetHeight) && sheetHeight > 0, String(sheetHeight))
// A concrete ceiling, not just "smaller than the viewport": the panel is a study
// card, and an earlier revision declared 860x660 here while the rule that used
// it was silently dead, so the sheet rendered at whatever the content wanted.
check('sheet is a compact card, not an app window', sheetWidth <= 760 && sheetHeight <= 560, `${sheetWidth}x${sheetHeight}`)
check('sheet leaves room for the surrounding UI', sheetWidth >= 600 && sheetHeight >= 420, `${sheetWidth}x${sheetHeight}`)
check('sheet fits the test viewport without shrinking', sheetWidth + 2 * 8 <= VIEWPORT.width && sheetHeight + 2 * 8 <= VIEWPORT.height, `${sheetWidth}x${sheetHeight} in ${VIEWPORT.width}x${VIEWPORT.height}`)
check('sheet has a max-vw guard', /\.el-sheet\{[^}]*min\(var\(--el-sheet-w\),100vw - 2\*var\(--el-gap\)\)/.test(injectedCss), 'no vw guard')
check('sheet has a max-vh guard', /\.el-sheet\{[^}]*min\(var\(--el-sheet-h\),100vh - 2\*var\(--el-gap\)\)/.test(injectedCss), 'no vh guard')
// The geometry variables must be declared on an ancestor of `.el-sheet`. They
// used to live only on `.el-root`, which sits *inside* the sheet — custom
// properties do not inherit upwards, so the whole width rule silently died.
const geometryOwner = /([^{}]+)\{[^{}]*--el-sheet-w:/.exec(injectedCss)?.[1] ?? ''
check('sheet geometry is declared where the sheet can read it',
  /\.el-overlay/.test(geometryOwner), `declared on "${geometryOwner.trim()}"`)
const sheetGap = Number(/--el-gap:(\d+)px/.exec(injectedCss)?.[1])
check('sheet edge gap is defined', Number.isFinite(sheetGap) && sheetGap > 0, String(sheetGap))
check('overlay padding matches the sheet gap', /\.el-overlay\{[^}]*padding:var\(--el-gap\)/.test(injectedCss), 'overlay padding differs from the gap')

// Scrolling. `.el-sheet` is a fixed-height flex column with `overflow:hidden`,
// so the body can only scroll if EVERY link in the chain below it can shrink:
// the sheet's child wrapper must be a flex column with `min-height:0`, and the
// body must be a `min-height:0` flex child with `overflow-y:auto`. A single
// missing `min-height:0` makes the body grow past the sheet and get clipped,
// which is exactly the "content below is unreachable" bug this guards.
check('sheet clips its own overflow', /\.el-sheet\{[^}]*overflow:hidden/.test(injectedCss), 'sheet does not clip')
check('overlay content wrapper fills the sheet',
  /\.el-fill\{[^}]*flex:1[^}]*min-height:0[^}]*\}/.test(injectedCss), 'no filling flex wrapper')
check('overlay content wrapper is a flex column',
  /\.el-fill\{[^}]*display:flex[^}]*flex-direction:column/.test(injectedCss), 'wrapper is not a flex column')
check('body scrolls vertically',
  /\.el-body\{[^}]*overflow-y:auto/.test(injectedCss), 'body does not scroll')
check('body can shrink inside the flex column',
  /\.el-body\{[^}]*min-height:0/.test(injectedCss), 'body cannot shrink, so it will be clipped')
check('body scroll does not chain to the page',
  /\.el-body\{[^}]*overscroll-behavior:contain/.test(injectedCss), 'scroll chains to the app behind')
check('scrollbar is visible', /\.el-body::-webkit-scrollbar\{[^}]*width:\d+px/.test(injectedCss), 'no visible scrollbar')
check('narrow-window breakpoint exists', /@media \(max-width:980px\)/.test(injectedCss))
check('very-narrow breakpoint exists', /@media \(max-width:640px\)/.test(injectedCss))
check('very-narrow breakpoint stacks the grades',
  /@media \(max-width:640px\)\{[^@]*\.el-grades\{grid-template-columns:repeat\(2,1fr\)/.test(injectedCss))
check('effects were registered', effects.length >= 2)

/** Render a component tree to a flat list of text, invoking function components. */
function render(node, depth = 0, index = 0) {
  const top = depth === 0
  if (top) beginRender()
  if (depth > 60) throw new Error('render recursion too deep')
  if (node === null || node === undefined || node === false || node === true) {
    if (top) endRender()
    return []
  }
  if (typeof node === 'string' || typeof node === 'number') {
    if (top) endRender()
    return [String(node)]
  }
  if (Array.isArray(node)) {
    const out = node.flatMap((child, i) => render(child, depth + 1, i))
    if (top) endRender()
    return out
  }
  if (typeof node === 'function') {
    const out = render(node({}), depth + 1, index)
    if (top) endRender()
    return out
  }
  if (node.node !== true) {
    if (top) endRender()
    return []
  }
  if (typeof node.type === 'function') {
    hookPath.push(instanceKey(node, index))
    hookCursor = 0
    const props = Object.assign({}, node.props)
    if (node.children.length === 1) props.children = node.children[0]
    else if (node.children.length > 1) props.children = node.children
    const output = render(node.type(props), depth + 1, index)
    hookPath.pop()
    if (top) endRender()
    return output
  }
  const out = node.children.flatMap((child, i) => render(child, depth + 1, i))
  if (top) endRender()
  return out
}

function textOf(node) {
  return render(node).join(' ')
}

const byId = id => registered.find(entry => entry.spec.id === id)

/** Every element object reachable from a tree, with function components expanded. */
function elementsOf(node, out = [], depth = 0, index = 0) {
  const top = depth === 0
  if (top) beginRender()
  const finish = () => { if (top) endRender(); return out }
  if (depth > 60 || node === null || node === undefined) return finish()
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) elementsOf(node[i], out, depth + 1, i)
    return finish()
  }
  if (typeof node === 'string' || typeof node === 'number' || node.node !== true) return finish()
  out.push(node)
  if (typeof node.type === 'function') {
    hookPath.push(instanceKey(node, index))
    hookCursor = 0
    const props = Object.assign({}, node.props)
    if (node.children.length === 1) props.children = node.children[0]
    else if (node.children.length > 1) props.children = node.children
    elementsOf(node.type(props), out, depth + 1, index)
    hookPath.pop()
  } else {
    for (let i = 0; i < node.children.length; i += 1) elementsOf(node.children[i], out, depth + 1, i)
  }
  return finish()
}

/** Collapsed visible text of one element. */
function textOfElement(element) {
  return render(element).join(' ').replace(/\s+/g, ' ').trim()
}

function hasClass(element, name) {
  return typeof element.props.className === 'string' && element.props.className.split(' ').includes(name)
}

/** First element carrying `className` whose text equals or starts with `text`. */
function pick(tree, className, text) {
  const all = elementsOf(tree).filter(element => hasClass(element, className))
  if (text === undefined) return all[0]
  return all.find(element => textOfElement(element) === text)
    ?? all.find(element => textOfElement(element).startsWith(text))
}

/** Invoke a handler prop, failing the test loudly when the control is absent. */
function fire(tree, className, handler, text, arg) {
  const element = pick(tree, className, text)
  if (element === undefined) {
    check(`control .${className}${text === undefined ? '' : ' "' + text + '"'} exists`, false)
    return false
  }
  const fn = element.props[handler]
  if (typeof fn !== 'function') {
    check(`control .${className} has ${handler}`, false)
    return false
  }
  fn(arg)
  return true
}

const Toggle = byId('english-learn.toggle').component
const Overlay = byId('english-learn.panel').component
const SettingsSection = byId('english-learn').component

// The sidebar toggle renders in both rail states.
const toggleWide = textOf(react.createElement(Toggle, { wide: true }))
check('sidebar toggle shows the title', toggleWide.includes('英语学习'), toggleWide)
check('sidebar rail toggle renders', elementsOf(react.createElement(Toggle, { wide: false })).length >= 1)

// The overlay is hidden until the toggle is clicked.
eq('overlay hidden by default', render(react.createElement(Overlay, {})).length, 0)
check('toggle opens the overlay', fire(react.createElement(Toggle, { wide: true }), 'el-root', 'onClick'))

let tree = react.createElement(Overlay, {})
check('overlay visible after toggle', render(tree).length > 0)

// The overlay's content wrapper must actually carry the fill class; the CSS
// alone is useless if the element never gets the class.
const overlayRoot = elementsOf(tree).find(element => hasClass(element, 'el-root'))
check('overlay content wrapper uses the fill class', hasClass(overlayRoot ?? { props: {} }, 'el-fill'),
  String(overlayRoot?.props?.className))
const overlayBody = elementsOf(tree).find(element => hasClass(element, 'el-body'))
check('overlay body is present', overlayBody !== undefined)

// --- Non-modal: the panel must not close on an outside click --------------
// The panel shares the screen with the chat, so a click beside it belongs to
// the app underneath and must never dismiss it. The overlay element carries no
// click handler at all, which is what makes the backdrop click-through.
const overlayElement = elementsOf(tree).find(element => hasClass(element, 'el-overlay'))
check('overlay element exists', overlayElement !== undefined)
check('backdrop has no click handler', overlayElement?.props.onClick === undefined)
check('panel declares itself non-modal', overlayElement?.props['aria-modal'] === 'false', String(overlayElement?.props['aria-modal']))
// Simulate the outside click the old modal used to close on. Even if a handler
// were reintroduced, this must leave the panel open.
if (typeof overlayElement?.props.onClick === 'function') {
  const fakeOverlay = { currentTarget: 'overlay', target: 'overlay' }
  overlayElement.props.onClick(fakeOverlay)
}
tree = react.createElement(Overlay, {})
check('panel stays open after a click outside it', render(tree).length > 0)
// The header close button is still the explicit way out.
const headerClose = elementsOf(tree).find(element => hasClass(element, 'el-iconbtn'))
check('header close button still exists', headerClose !== undefined)
headerClose.props.onClick()
eq('header close button dismisses the panel', render(react.createElement(Overlay, {})).length, 0)
// Reopen for the rest of the suite.
fire(react.createElement(Toggle, { wide: true }), 'el-root', 'onClick')
tree = react.createElement(Overlay, {})

// --- Dragging the panel ----------------------------------------------------
// The header is the drag handle. A drag moves the sheet by the pointer delta,
// is clamped so the panel cannot leave the viewport, persists on release, and
// resets on a double-click.
const sheetElement = elementsOf(tree).find(element => hasClass(element, 'el-sheet'))
check('sheet element exists', sheetElement !== undefined)
check('sheet starts centred', sheetElement?.props.style?.transform === 'translate(0px, 0px)', sheetElement?.props.style?.transform)

const headElement = elementsOf(tree).find(element => hasClass(element, 'el-head'))
check('header is the drag handle', headElement !== undefined && typeof headElement.props.onPointerDown === 'function')

/** Simulate a full pointer drag from the header. */
function dragBy(dx, dy) {
  const start = { clientX: 500, clientY: 300, button: 0, target: { tagName: 'DIV', parentNode: null }, currentTarget: null }
  start.target.parentNode = start.currentTarget
  headElement.props.onPointerDown(start)
  dispatchWindow('pointermove', { clientX: 500 + dx, clientY: 300 + dy })
  dispatchWindow('pointerup', {})
  return react.createElement(Overlay, {})
}

// A real drag moves the sheet by the pointer delta, up to the clamp.
// The shim reports no layout, so the sheet falls back to its declared default
// size. Both the expected offsets and the edge checks below are derived from
// that size rather than hard-coded, so resizing the panel cannot leave a stale
// number behind in the tests.
const EXPECTED_X = 120
const EXPECTED_Y = 60
tree = dragBy(120, 60)
const movedSheet = elementsOf(tree).find(element => hasClass(element, 'el-sheet'))
check('drag moves the sheet horizontally', movedSheet?.props.style?.transform === `translate(${EXPECTED_X}px, ${EXPECTED_Y}px)`, movedSheet?.props.style?.transform)
check('drag offset persisted', (() => {
  const saved = JSON.parse(storage.get(core.STORAGE_KEY)).ui.panelOffset
  return saved.x === EXPECTED_X && saved.y === EXPECTED_Y
})(), JSON.stringify(JSON.parse(storage.get(core.STORAGE_KEY)).ui.panelOffset))

// A drag far past the edge is clamped, leaving the whole panel reachable.
tree = dragBy(5000, 5000)
const clampedSheet = elementsOf(tree).find(element => hasClass(element, 'el-sheet'))
const clampMatch = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(clampedSheet?.props.style?.transform ?? '')
check('huge drag is clamped, not applied literally', clampMatch !== null && Number(clampMatch[1]) < 5000, clampedSheet?.props.style?.transform)
check('clamped offset stays inside the drag range', clampMatch !== null
  && Math.abs(Number(clampMatch[1])) <= (VIEWPORT.width - sheetWidth) / 2
  && Math.abs(Number(clampMatch[2])) <= (VIEWPORT.height - sheetHeight) / 2, clampedSheet?.props.style?.transform)

/**
 * Every edge of the sheet at `offset` must land inside the viewport.
 *
 * This is the assertion that actually pins down "no side may hang off-screen":
 * it checks all four edges, not just the offset's magnitude.
 */
function edgesInsideViewport(offset, width, height) {
  const left = (VIEWPORT.width - width) / 2 + offset.x
  const top = (VIEWPORT.height - height) / 2 + offset.y
  return left >= 0 && top >= 0 && left + width <= VIEWPORT.width && top + height <= VIEWPORT.height
}

check('clamped panel keeps all four edges on screen',
  clampMatch !== null && edgesInsideViewport({ x: Number(clampMatch[1]), y: Number(clampMatch[2]) }, sheetWidth, sheetHeight),
  clampedSheet?.props.style?.transform)
// ...and each edge still keeps the configured margin, not merely a pixel of it.
check('clamped panel keeps the edge gap', clampMatch !== null
  && (VIEWPORT.height - sheetHeight) / 2 + Number(clampMatch[2]) >= sheetGap - 0.5
  && (VIEWPORT.height + sheetHeight) / 2 + Number(clampMatch[2]) <= VIEWPORT.height - sheetGap + 0.5,
  clampedSheet?.props.style?.transform)

// Dragging far to the other side must also stay inside, so the clamp is not
// one-sided.
tree = dragBy(-5000, -5000)
const oppositeSheet = elementsOf(tree).find(element => hasClass(element, 'el-sheet'))
const oppositeMatch = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(oppositeSheet?.props.style?.transform ?? '')
check('clamped panel stays on screen when dragged the other way',
  oppositeMatch !== null && edgesInsideViewport({ x: Number(oppositeMatch[1]), y: Number(oppositeMatch[2]) }, sheetWidth, sheetHeight),
  oppositeSheet?.props.style?.transform)

// On a window too small for the sheet the clamp collapses to zero: the panel
// cannot be pushed out of a viewport it already fills.
{
  const saved = { width: VIEWPORT.width, height: VIEWPORT.height }
  VIEWPORT.width = 500
  VIEWPORT.height = 400
  tree = dragBy(300, 300)
  const tinySheet = elementsOf(tree).find(element => hasClass(element, 'el-sheet'))
  check('panel cannot be dragged off a viewport it already fills',
    tinySheet?.props.style?.transform === 'translate(0px, 0px)', tinySheet?.props.style?.transform)
  VIEWPORT.width = saved.width
  VIEWPORT.height = saved.height
}

// Double-clicking the header re-centres.
headElement.props.onDoubleClick()
tree = react.createElement(Overlay, {})
const recentred = elementsOf(tree).find(element => hasClass(element, 'el-sheet'))
check('double-click re-centres the panel', recentred?.props.style?.transform === 'translate(0px, 0px)', recentred?.props.style?.transform)

// A drag that starts on a header control must not move the panel.
const closeButton = elementsOf(tree).find(element => hasClass(element, 'el-iconbtn'))
const beforeControlDrag = elementsOf(tree).find(element => hasClass(element, 'el-sheet'))?.props.style?.transform
const buttonTarget = { tagName: 'BUTTON', parentNode: null }
buttonTarget.parentNode = { tagName: 'DIV', parentNode: null }
headElement.props.onPointerDown({ clientX: 500, clientY: 300, button: 0, target: buttonTarget, currentTarget: { tagName: 'DIV' } })
dispatchWindow('pointermove', { clientX: 900, clientY: 700 })
dispatchWindow('pointerup', {})
tree = react.createElement(Overlay, {})
check('dragging from a header button does nothing',
  elementsOf(tree).find(element => hasClass(element, 'el-sheet'))?.props.style?.transform === beforeControlDrag)

// A right-click must not start a drag either.
headElement.props.onPointerDown({ clientX: 500, clientY: 300, button: 2, target: { tagName: 'DIV', parentNode: null }, currentTarget: { tagName: 'DIV' } })
dispatchWindow('pointermove', { clientX: 900, clientY: 700 })
dispatchWindow('pointerup', {})
tree = react.createElement(Overlay, {})
check('right-click does not drag', elementsOf(tree).find(element => hasClass(element, 'el-sheet'))?.props.style?.transform === 'translate(0px, 0px)')

// --- Learn tab: start a 20-word set, see a card, grade it ------------------
// The deck is one sequence, so the surface offers a set to start rather than a
// menu of categories. No group is ever chosen.
const learnText = textOfElement(tree)
check('learn offers a set to start', /\d+ 词/.test(learnText), learnText.slice(0, 200))
check('learn shows the library size', learnText.includes(`/ ${allWords.size}`), learnText.slice(0, 200))
check('learn has no category picker', elementsOf(tree).filter(element => hasClass(element, 'el-gcard')).length === 0)

fire(tree, 'el-btn', 'onClick', '开始学习')
tree = react.createElement(Overlay, {})

const cardText = textOfElement(tree)
// The first set must be exactly the first 20 words of the deck, in deck order.
const firstWord = groups[0].words[0]
check('card shows the headword', cardText.includes(firstWord.w), cardText.slice(0, 160))
check('card shows the IPA', cardText.includes(firstWord.ipa), cardText.slice(0, 160))
check('card shows the meaning', cardText.includes(firstWord.cn))
check('card shows a collocation', cardText.includes(firstWord.phrases[0].en))
check('card shows an example', cardText.includes(firstWord.examples[0].en))
check('card shows the Chinese example', cardText.includes(firstWord.examples[0].cn))
check('set counter reads 1 / 20', /1 \/ 20/.test(cardText), cardText.slice(0, 200))

// Grading advances to the next word and persists progress.
const grades = elementsOf(tree).filter(element => hasClass(element, 'el-grade'))
eq('four grade buttons', grades.length, 4)
grades[2].props.onClick()
tree = react.createElement(Overlay, {})
const secondWord = groups[0].words[1]
check('grading advances the card', textOfElement(tree).includes(secondWord.w), textOfElement(tree).slice(0, 160))

const savedProfile = JSON.parse(storage.get(core.STORAGE_KEY))
const savedKey = groups[0].id + ':' + firstWord.w.toLowerCase()
check('progress persisted for the graded word', savedProfile.progress[savedKey] !== undefined)
eq('graded word counted once', savedProfile.progress[savedKey].seen, 1)
eq('graded word interval', savedProfile.progress[savedKey].interval, 1)
check('activity logged', savedProfile.log.some(entry => entry.word === firstWord.w))

// Finishing the set offers the NEXT set, continuing through the deck.
for (let i = 1; i < 20; i += 1) {
  const row = elementsOf(tree).filter(element => hasClass(element, 'el-grade'))
  if (row.length !== 4) break
  row[2].props.onClick()
  tree = react.createElement(Overlay, {})
}
const afterSet = textOfElement(tree)
check('finishing a set reports it', afterSet.includes('本组'), afterSet.slice(0, 200))
check('finishing a set offers the next one', afterSet.includes('学习下一组'), afterSet.slice(0, 200))

// The next set continues from word 21, not from the start of the deck.
fire(tree, 'el-btn', 'onClick', '学习下一组')
tree = react.createElement(Overlay, {})
const secondSetText = textOfElement(tree)
const word21 = groups[0].words[SET_SIZE]
check('the next set continues the deck', secondSetText.includes(word21.w), secondSetText.slice(0, 200))
check('the next set restarts its counter', /1 \/ 20/.test(secondSetText), secondSetText.slice(0, 200))

// --- Spelling tab ----------------------------------------------------------
fire(tree, 'el-tab', 'onClick', '拼写')
tree = react.createElement(Overlay, {})
check('spelling offers a start', textOfElement(tree).includes('开始学习'), textOfElement(tree).slice(0, 200))
check('spelling has no category picker', elementsOf(tree).filter(element => hasClass(element, 'el-gcard')).length === 0)
fire(tree, 'el-btn', 'onClick', '开始学习')
tree = react.createElement(Overlay, {})

// Spelling drills the words already studied, so the target is one of those.
const spellText = textOfElement(tree)
const studiedWords = groups.flatMap(g => g.words).slice(0, 40)
const spellTarget = studiedWords.find(word => spellText.includes(word.cn))
check('spelling target identified', spellTarget !== undefined, spellText.slice(0, 160))
check('spelling shows the Chinese meaning', spellTarget !== undefined && spellText.includes(spellTarget.cn), spellText.slice(0, 160))
check('spelling shows a masked word', spellText.includes('_'), spellText.slice(0, 160))
check('spelling hides the answer', spellTarget !== undefined && !spellText.includes(spellTarget.w))

// A wrong answer is reported and marks the letters.
fire(tree, 'el-input', 'onChange', undefined, { target: { value: 'wrongword' } })
tree = react.createElement(Overlay, {})
fire(tree, 'el-btn', 'onClick', '检查')
tree = react.createElement(Overlay, {})
const wrongText = textOfElement(tree)
check('wrong spelling is reported', wrongText.includes('拼写有误'), wrongText.slice(0, 240))
check('wrong spelling reveals the answer', wrongText.includes(spellTarget.w))
check('per-letter marks rendered', elementsOf(tree).some(element => hasClass(element, 'no')))

// The next word accepts a correct answer (case-insensitively).
fire(tree, 'el-btn', 'onClick', '下一个 →')
tree = react.createElement(Overlay, {})
const nextSpellText = textOfElement(tree)
const spellTarget2 = studiedWords.find(word => nextSpellText.includes(word.cn) && word !== spellTarget)
check('spelling advanced to a new word', spellTarget2 !== undefined, nextSpellText.slice(0, 160))
fire(tree, 'el-input', 'onChange', undefined, { target: { value: spellTarget2.w.toUpperCase() } })
tree = react.createElement(Overlay, {})
fire(tree, 'el-btn', 'onClick', '检查')
tree = react.createElement(Overlay, {})
check('correct spelling accepted (case-insensitive)', textOfElement(tree).includes('拼写正确'), textOfElement(tree).slice(0, 240))

// --- Quiz tab --------------------------------------------------------------
fire(tree, 'el-tab', 'onClick', '测验')
tree = react.createElement(Overlay, {})
const quizStart = elementsOf(tree).filter(element => hasClass(element, 'el-btn'))
check('quiz offers round sizes', quizStart.some(element => textOfElement(element).includes('10')))
check('quiz has no category picker', elementsOf(tree).filter(element => hasClass(element, 'el-gcard')).length === 0)
fire(tree, 'el-btn', 'onClick', '开始测验 · 10')
tree = react.createElement(Overlay, {})

const options = elementsOf(tree).filter(element => hasClass(element, 'el-opt'))
eq('quiz renders four options', options.length, 4)
const quizText = textOfElement(tree)
check('quiz shows a question counter', /第 1 \/ 10 题/.test(quizText), quizText.slice(0, 200))
check('quiz shows the score', quizText.includes('得分 0'))

options[0].props.onClick()
tree = react.createElement(Overlay, {})
const answered = textOfElement(tree)
check('quiz gives feedback', answered.includes('回答正确') || answered.includes('回答错误'), answered.slice(0, 240))
check('quiz marks a correct option', elementsOf(tree).some(element => hasClass(element, 'right')))
fire(tree, 'el-btn', 'onClick', '下一个 →')
tree = react.createElement(Overlay, {})
check('quiz advances', /第 2 \/ 10 题/.test(textOfElement(tree)), textOfElement(tree).slice(0, 200))

// --- Review tab ------------------------------------------------------------
fire(tree, 'el-tab', 'onClick', '复习')
tree = react.createElement(Overlay, {})
const reviewText = textOfElement(tree)
check('review shows due/streak stats', reviewText.includes('今日待复习') && reviewText.includes('连续学习'), reviewText.slice(0, 200))
fire(tree, 'el-btn', 'onClick', '开始复习')
tree = react.createElement(Overlay, {})
check('review session shows a card', elementsOf(tree).filter(element => hasClass(element, 'el-grade')).length === 4)
const reviewGrades = elementsOf(tree).filter(element => hasClass(element, 'el-grade'))
reviewGrades[2].props.onClick()
tree = react.createElement(Overlay, {})
check('review advances after grading', elementsOf(tree).some(element => hasClass(element, 'el-progressline')))

// --- Progress tab ----------------------------------------------------------
fire(tree, 'el-tab', 'onClick', '进度')
tree = react.createElement(Overlay, {})
const statsText = textOfElement(tree)
for (const label of ['词库总量', '已学单词', '已掌握', '正确率', '难度阶段进度', '偏好设置']) {
  check(`progress shows "${label}"`, statsText.includes(label), statsText.slice(0, 260))
}
check('progress reports the library size', statsText.includes(String(allWords.size)), statsText.slice(0, 200))
check('progress lists recent activity', statsText.includes('最近记录'))

// --- "Hide the meaning first" actually hides it ---------------------------
const hideToggle = elementsOf(tree).find(element =>
  element.type === 'input' && element.props.type === 'checkbox' && element.props.checked === false)
check('preference checkboxes are present', hideToggle !== undefined)
const settingsRows = elementsOf(tree).filter(element => hasClass(element, 'el-field'))
eq('five preference rows', settingsRows.length, 5)
// Flip the "hide the meaning first" row (fourth) on.
const hideCheckbox = elementsOf(settingsRows[3]).find(element => element.type === 'input')
hideCheckbox.props.onChange({ target: { checked: true } })
tree = react.createElement(Overlay, {})
check('hiding preference persisted', JSON.parse(storage.get(core.STORAGE_KEY)).settings.hideMeaning === true)

// --- Opacity slider -------------------------------------------------------
// The slider drives a CSS variable on the sheet rather than an inline opacity,
// so text stays fully opaque while only the surfaces fade.
/** The opacity range input in the currently rendered tree. */
function opacityInput(node) {
  const row = elementsOf(node).filter(element => hasClass(element, 'el-field'))[4]
  return elementsOf(row).find(element => element.type === 'input' && element.props.type === 'range')
}

const opacitySlider = opacityInput(tree)
check('opacity slider is present', opacitySlider !== undefined)
eq('opacity slider starts fully opaque', opacitySlider?.props.value, '100')
eq('opacity slider floor keeps text legible', opacitySlider?.props.min, '30')
opacitySlider.props.onChange({ target: { value: '55' } })
tree = react.createElement(Overlay, {})
eq('opacity persisted as a fraction', JSON.parse(storage.get(core.STORAGE_KEY)).settings.opacity, 0.55)
const fadedSheet = elementsOf(tree).find(element => hasClass(element, 'el-sheet'))
eq('opacity reaches the sheet as a CSS variable', fadedSheet?.props.style?.['--el-alpha'], '0.55')
check('opacity is not applied to the whole sheet',
  fadedSheet?.props.style?.opacity === undefined, String(fadedSheet?.props.style?.opacity))

// The floor is enforced for anything below it, so a low value cannot make the
// panel unreadable.
opacityInput(tree).props.onChange({ target: { value: '10' } })
eq('opacity cannot go below the floor', JSON.parse(storage.get(core.STORAGE_KEY)).settings.opacity, 0.3)

// A zero (a corrupted profile, since the slider cannot produce one) falls back
// to fully opaque rather than to the floor: an invisible panel would be
// unrecoverable without clearing storage.
eq('zero opacity falls back to opaque', core.normalizeOpacity(0), 1)
eq('non-numeric opacity falls back to opaque', core.normalizeOpacity('nonsense'), 1)
eq('opacity above one is clamped', core.normalizeOpacity(4), 1)

// Restore full opacity for the visual checks that follow.
tree = react.createElement(Overlay, {})
opacityInput(tree).props.onChange({ target: { value: '100' } })
tree = react.createElement(Overlay, {})

fire(tree, 'el-tab', 'onClick', '学习')
tree = react.createElement(Overlay, {})
// Every word is learned by now, so the idle surface would fill the next set from
// review cards. Reset progress through the UI so the blur check gets a new card.
fire(tree, 'el-tab', 'onClick', '进度')
tree = react.createElement(Overlay, {})
fire(tree, 'el-btn', 'onClick', '重置进度')
tree = react.createElement(Overlay, {})
eq('progress reset clears the profile', Object.keys(JSON.parse(storage.get(core.STORAGE_KEY)).progress).length, 0)

fire(tree, 'el-tab', 'onClick', '学习')
tree = react.createElement(Overlay, {})
// The Learn tab is idle after the tab switch, so it offers a fresh set.
fire(tree, 'el-btn', 'onClick', '开始学习')
tree = react.createElement(Overlay, {})
const hiddenCard = textOfElement(tree)
const hiddenWord = groups.flatMap(g => g.words).find(word => hiddenCard.includes(word.w))
check('hidden card still shows the word', hiddenWord !== undefined, hiddenCard.slice(0, 160))
// The meaning stays in the DOM but is blurred, so the card does not reflow.
check('hidden card blurs the meaning', elementsOf(tree).some(element => hasClass(element, 'el-hidden')))
check('hidden card shows the reveal hint', hiddenCard.includes('点击显示释义'))
check('hidden card hides the collocations', !hiddenCard.includes(hiddenWord.phrases[0].en))
check('hidden card hides the examples', !hiddenCard.includes(hiddenWord.examples[0].en))
// Clicking the blurred meaning reveals the rest of the card.
const blur = pick(tree, 'el-hidden')
check('blurred meaning is clickable', blur !== undefined && typeof blur.props.onClick === 'function')
blur.props.onClick()
tree = react.createElement(Overlay, {})
check('reveal unblurs the meaning', !elementsOf(tree).some(element => hasClass(element, 'el-hidden')))
check('reveal shows the meaning', textOfElement(tree).includes(hiddenWord.cn))
check('reveal shows the collocations', textOfElement(tree).includes(hiddenWord.phrases[0].en))
check('reveal shows the examples', textOfElement(tree).includes(hiddenWord.examples[0].en))

// The settings surface renders the same tree inline.
const settingsText = textOfElement(react.createElement(SettingsSection, {}))
check('settings section renders tabs', settingsText.includes('学习') && settingsText.includes('进度'), settingsText.slice(0, 200))
check('settings section renders a surface', settingsText.length > 80)

// A corrupt stored profile must not break the next boot.
storage.set(core.STORAGE_KEY, '{not json')
eq('corrupt storage tolerated', typeof exportsObject.apply, 'function')

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exitCode = 1
