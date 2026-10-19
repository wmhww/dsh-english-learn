/**
 * dsh-english-learn browser half.
 *
 * Mounted two ways from one component tree: the sidebar toggle opens a
 * full-screen overlay, and the Settings > 英语学习 section renders the same
 * surfaces inline. All learner state lives in localStorage under a single
 * key; the core module supplies the scheduling, spelling and quiz logic.
 *
 * This file is concatenated after core.mjs and the generated data by
 * scripts/build.mjs, so it can call the core functions directly and `react`
 * is already in scope.
 * @module dsh-english-learn/ui
 */

/** Locale namespace this plugin owns. */
var NS = 'english-learn'

/** Built-in word groups (injected by the build as `GROUPS`). */
var GROUPS = typeof GROUPS === 'undefined' ? [] : GROUPS

var MESSAGES = {
  zh: {
    'app.title': '英语学习',
    'app.subtitle': '开源词库 · 音标 · 短语 · 例句 · 拼写 · 复习',
    'panel.open': '打开英语学习',
    'tab.learn': '学习',
    'tab.spell': '拼写',
    'tab.quiz': '测验',
    'tab.review': '复习',
    'tab.stats': '进度',
    'action.close': '关闭',
    'panel.dragHint': '拖动标题栏可移动面板，双击回到居中',
    'action.back': '返回',
    'action.speak': '朗读',
    'action.next': '下一个',
    'action.hint': '提示',
    'action.restart': '再来一轮',
    'action.check': '检查',
    'action.reset': '重置进度',
    'action.resetConfirm': '确定要清空全部学习进度吗？此操作不可撤销。',
    'learn.progress': '已学 {done} / {total}',
    'learn.newWord': '新词',
    'learn.dueWord': '待复习',
    'learn.finished': '本轮完成！共学习 {n} 个单词。',
    'learn.reveal': '点击显示释义',
    'learn.startBatch': '开始学习 · {n} 词',
    'learn.nextBatch': '学习下一组 · {n} 词',
    'learn.batchOf': '本组第 {i} / {n} 词',
    'learn.batchDone': '本组 {n} 词学完了',
    'learn.allDone': '词库里的词都学完了，去复习巩固吧',
    'learn.remaining': '还剩 {n} 个新词',
    'learn.reviewDue': '先复习到期的 {n} 词',
    'learn.library': '浏览词库',
    'learn.hideLibrary': '收起词库',
    'learn.sessionHint': '一次学一组，每组 {n} 个词',
    'learn.needWords': '先学几个词，再来拼写和测验',
    'card.phrases': '短语搭配',
    'card.examples': '例句',
    'grade.again': '忘记了',
    'grade.hard': '有点难',
    'grade.good': '记住了',
    'grade.easy': '太简单',
    'grade.next': '{label} · {interval}后',
    'spell.title': '拼写练习',
    'spell.prompt': '根据中文释义和音标拼写单词',
    'spell.placeholder': '在这里输入英文单词…',
    'spell.correct': '拼写正确！',
    'spell.wrong': '拼写有误，正确拼写是：{word}',
    'spell.reveal': '显示答案',
    'quiz.question': '第 {i} / {n} 题',
    'quiz.score': '得分 {score}',
    'quiz.correct': '回答正确',
    'quiz.wrong': '回答错误，正确答案是：{answer}',
    'quiz.done': '本轮结束',
    'quiz.result': '答对 {right} / {total} 题（{pct}%）',
    'quiz.wrongList': '错题回顾',
    'quiz.start': '开始测验',
    'quiz.pool': '从已学的 {n} 个词里出题',
    'review.title': '复习',
    'review.due': '今天有 {n} 个单词待复习',
    'review.none': '暂时没有需要复习的单词，明天再来吧。',
    'review.start': '开始复习',
    'review.done': '复习完成！共复习 {n} 个单词。',
    'review.againCount': '其中 {n} 个需要重新记忆。',
    'stats.total': '词库总量',
    'stats.learned': '已学单词',
    'stats.due': '今日待复习',
    'stats.mastered': '已掌握',
    'stats.accuracy': '正确率',
    'stats.streak': '连续学习',
    'stats.days': '天',
    'stats.byStage': '难度阶段进度（按顺序学习）',
    'stats.recent': '最近记录',
    'stats.empty': '还没有学习记录，去「学习」页开始吧。',
    'stats.fresh': '未学习',
    'log.learn': '学习',
    'log.spell': '拼写',
    'log.quiz': '测验',
    'log.review': '复习',
    'settings.title': '偏好设置',
    'settings.sessionSize': '每组单词数',
    'settings.autoSpeak': '自动朗读单词',
    'settings.accent': '发音口音',
    'settings.hideMeaning': '卡片先隐藏释义',
    'settings.opacity': '面板透明度',
  },
  en: {
    'app.title': 'English Learning',
    'app.subtitle': 'Open-source word data · IPA · phrases · examples · spelling · review',
    'panel.open': 'Open English Learning',
    'tab.learn': 'Learn',
    'tab.spell': 'Spelling',
    'tab.quiz': 'Quiz',
    'tab.review': 'Review',
    'tab.stats': 'Progress',
    'action.close': 'Close',
    'panel.dragHint': 'Drag the title bar to move the panel; double-click to re-centre',
    'action.back': 'Back',
    'action.speak': 'Speak',
    'action.next': 'Next',
    'action.hint': 'Hint',
    'action.restart': 'New round',
    'action.check': 'Check',
    'action.reset': 'Reset progress',
    'action.resetConfirm': 'Clear all learning progress? This cannot be undone.',
    'learn.progress': 'Learned {done} / {total}',
    'learn.newWord': 'New',
    'learn.dueWord': 'Due',
    'learn.finished': 'Round complete! {n} words studied.',
    'learn.reveal': 'Click to show the meaning',
    'learn.startBatch': 'Start · {n} words',
    'learn.nextBatch': 'Next set · {n} words',
    'learn.batchOf': 'Word {i} / {n} in this set',
    'learn.batchDone': 'All {n} words in this set are done',
    'learn.allDone': 'The whole library is learned — review to keep it fresh',
    'learn.remaining': '{n} new words left',
    'learn.reviewDue': 'Review the {n} due words first',
    'learn.library': 'Browse the library',
    'learn.hideLibrary': 'Hide the library',
    'learn.sessionHint': 'One set at a time, {n} words each',
    'learn.needWords': 'Learn a few words first, then come back to spelling and quizzes',
    'card.phrases': 'Collocations',
    'card.examples': 'Examples',
    'grade.again': 'Forgot',
    'grade.hard': 'Hard',
    'grade.good': 'Good',
    'grade.easy': 'Easy',
    'grade.next': '{label} · in {interval}',
    'spell.title': 'Spelling practice',
    'spell.prompt': 'Type the English word for this meaning and IPA',
    'spell.placeholder': 'Type the English word…',
    'spell.correct': 'Correct!',
    'spell.wrong': 'Not quite — the correct spelling is {word}',
    'spell.reveal': 'Show answer',
    'quiz.question': 'Question {i} / {n}',
    'quiz.score': 'Score {score}',
    'quiz.correct': 'Correct',
    'quiz.wrong': 'Wrong — the answer is {answer}',
    'quiz.done': 'Round complete',
    'quiz.result': '{right} / {total} correct ({pct}%)',
    'quiz.wrongList': 'Review the misses',
    'quiz.start': 'Start quiz',
    'quiz.pool': 'Questions drawn from the {n} words you have studied',
    'review.title': 'Review',
    'review.due': '{n} words are due today',
    'review.none': 'Nothing due right now — come back tomorrow.',
    'review.start': 'Start review',
    'review.done': 'Review complete! {n} words reviewed.',
    'review.againCount': '{n} of them need another look.',
    'stats.total': 'Words in library',
    'stats.learned': 'Words learned',
    'stats.due': 'Due today',
    'stats.mastered': 'Mastered',
    'stats.accuracy': 'Accuracy',
    'stats.streak': 'Study streak',
    'stats.days': 'days',
    'stats.byStage': 'Difficulty stages (studied in order)',
    'stats.recent': 'Recent activity',
    'stats.empty': 'No activity yet — start on the Learn tab.',
    'stats.fresh': 'Not started',
    'log.learn': 'Learn',
    'log.spell': 'Spelling',
    'log.quiz': 'Quiz',
    'log.review': 'Review',
    'settings.title': 'Preferences',
    'settings.sessionSize': 'Words per session',
    'settings.autoSpeak': 'Speak words automatically',
    'settings.accent': 'Accent',
    'settings.hideMeaning': 'Hide the meaning first',
    'settings.opacity': 'Panel opacity',
  },
}

/** Active dictionary, picked from the document language at call time. */
function dictionary() {
  var lang = typeof document === 'undefined' ? 'zh' : document.documentElement.lang
  return String(lang || '').toLowerCase().indexOf('en') === 0 ? MESSAGES.en : MESSAGES.zh
}

/** Translate a key with `{name}` params; an unknown key degrades to itself. */
function tr(key, params) {
  var text = dictionary()[key]
  if (text === undefined) text = MESSAGES.zh[key]
  if (text === undefined) return key
  if (params !== undefined) {
    for (var name in params) {
      if (Object.prototype.hasOwnProperty.call(params, name)) {
        text = text.split('{' + name + '}').join(String(params[name]))
      }
    }
  }
  return text
}

/* ------------------------------------------------------------------ *
 * Data shaping
 * ------------------------------------------------------------------ */

/**
 * The whole deck as one ordered list.
 *
 * The generated files are a difficulty progression (easiest first), so they are
 * flattened into a single sequence rather than exposed as categories: the
 * learner studies one 20-word set at a time and moves straight on to the next,
 * with no group to choose. `origin` is kept only as metadata for the library
 * view, never as something to pick.
 */
var ENTRIES = []
var BY_KEY = {}
for (var gi = 0; gi < GROUPS.length; gi += 1) {
  var group = GROUPS[gi]
  group.entries = []
  for (var wi = 0; wi < group.words.length; wi += 1) {
    var raw = group.words[wi]
    var entry = {
      key: wordKey(group.id, raw.w),
      origin: group.title,
      originId: group.id,
      level: group.level,
      word: raw.w,
      ipa: raw.ipa,
      pos: raw.pos,
      cn: raw.cn,
      phrases: raw.phrases || [],
      examples: raw.examples || [],
    }
    group.entries.push(entry)
    ENTRIES.push(entry)
    BY_KEY[entry.key] = entry
  }
}

/** Whether a word has ever been studied. */
function isSeen(progress) {
  return progress !== undefined && progress.seen > 0
}

/**
 * The next set of words to study.
 *
 * Unseen words come first, in deck order, so each set advances through the
 * library; once the library is exhausted the due words take over, so the
 * surface never dead-ends.
 * @param {number} size - words per set.
 * @param {number} now - epoch ms.
 * @returns {Array<object>} the entries for this set.
 */
function nextBatch(size, now) {
  var profile = appState.profile
  var fresh = []
  var due = []
  for (var i = 0; i < ENTRIES.length; i += 1) {
    var progress = profile.progress[ENTRIES[i].key]
    if (!isSeen(progress)) fresh.push(ENTRIES[i])
    else if (progress.due <= now) due.push(ENTRIES[i])
  }
  return fresh.concat(due).slice(0, size)
}

/** How many words have never been studied. */
function freshCount() {
  var profile = appState.profile
  var count = 0
  for (var i = 0; i < ENTRIES.length; i += 1) {
    if (!isSeen(profile.progress[ENTRIES[i].key])) count += 1
  }
  return count
}

/** Every word that has been studied at least once, newest activity first. */
function studiedEntries() {
  var profile = appState.profile
  var out = []
  for (var i = 0; i < ENTRIES.length; i += 1) {
    if (isSeen(profile.progress[ENTRIES[i].key])) out.push(ENTRIES[i])
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

/** Read the stored profile, tolerating a missing or corrupt value. */
function readStorage() {
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

/** Persist the profile; a quota or privacy error must not break the UI. */
function writeStorage(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch (error) {
    /* storage unavailable: the session still works, it just will not persist */
  }
}

/* ------------------------------------------------------------------ *
 * Speech
 * ------------------------------------------------------------------ */

/** Cached voice list; the browser fills it in asynchronously. */
var voiceCache = null

function englishVoices() {
  try {
    if (!window.speechSynthesis) return []
    if (voiceCache === null || voiceCache.length === 0) {
      voiceCache = window.speechSynthesis.getVoices() || []
    }
    return voiceCache
  } catch (error) {
    return []
  }
}

/** Speak one English word or sentence using the configured accent. */
function speak(text, accent) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return
    var want = accent || appState.profile.settings.accent || 'en-GB'
    window.speechSynthesis.cancel()
    var utterance = new window.SpeechSynthesisUtterance(String(text))
    utterance.lang = want
    utterance.rate = 0.9
    var prefix = want.slice(0, 2).toLowerCase()
    var voices = englishVoices()
    for (var i = 0; i < voices.length; i += 1) {
      var lang = String(voices[i].lang || '').replace('_', '-').toLowerCase()
      if (lang.indexOf(prefix) === 0) {
        utterance.voice = voices[i]
        break
      }
    }
    window.speechSynthesis.speak(utterance)
  } catch (error) {
    /* speech is a convenience; silence is an acceptable failure */
  }
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

/**
 * Free space kept between the panel and every viewport edge, in CSS pixels.
 *
 * The sheet is centred and then offset by a transform, so the largest legal
 * offset is `(viewport - sheet) / 2 - PANEL_EDGE_GAP`. That pins all four edges
 * inside the viewport with a constant margin. An earlier clamp only guaranteed a
 * partial overlap, which still let corners hang off-screen on a small window.
 *
 * The same number is published to CSS as `--el-gap`, and the sheet's width and
 * height are capped at `viewport - 2 * gap`, so a drag can never be clamped to a
 * position where the panel does not fit in the first place.
 */
var PANEL_EDGE_GAP = 8

/** Preferred sheet size, before the viewport guards shrink it. */
var PANEL_WIDTH = 700
var PANEL_HEIGHT = 500

/** The whole UI state; replaced wholesale on every mutation. */
var appState = {
  open: false,
  profile: hydrate(readStorage()),
  tab: 'learn',
  /** Active card queue: {kind, entries, index, grades, done, fromReview}. */
  session: null,
  /** Spelling surface state. */
  spell: null,
  /** Quiz surface state. */
  quiz: null,
  /** Whether the library list shows every word or only the first screenful. */
  showAll: false,
  /** Panel drag offset from centre; live during a drag, persisted on release. */
  panelOffset: { x: 0, y: 0 },
  /** Transient message shown at the foot of the panel. */
  toast: null,
}

appState.tab = (appState.profile.ui && appState.profile.ui.tab) || 'learn'
appState.panelOffset = panelOffset()

var listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  return function unsubscribe() {
    listeners.delete(listener)
  }
}

function getState() {
  return appState
}

/** Merge a patch into the state and notify every subscriber. */
function setState(patch) {
  var next = Object.assign({}, appState, patch)
  appState = next
  listeners.forEach(function (listener) {
    try {
      listener()
    } catch (error) {
      /* one broken subscriber must not stop the others */
    }
  })
}

/** React binding for the store. */
function useAppState() {
  return react.useSyncExternalStore(subscribe, getState)
}

/** Persist the profile after a mutation. */
function saveProfile(profile) {
  writeStorage(profile)
  setState({ profile: profile })
}

/** Remember which surface the learner had open, so the panel reopens there. */
function rememberUi(tab) {
  var profile = appState.profile
  profile.ui = Object.assign({}, profile.ui, { tab: tab })
  writeStorage(profile)
}

/* ------------------------------------------------------------------ *
 * Panel dragging
 * ------------------------------------------------------------------ */

/**
 * Offset of the panel from its default centred position, in CSS pixels.
 *
 * Stored as a *delta* rather than an absolute position so the panel stays
 * centred when the window is resized or when the sheet shrinks at a breakpoint —
 * an absolute left/top would leave it stranded off-centre after a resize.
 */
function panelOffset() {
  var saved = appState.profile.ui && appState.profile.ui.panelOffset
  if (saved === undefined || saved === null) return { x: 0, y: 0 }
  var x = Number(saved.x)
  var y = Number(saved.y)
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 }
}

/** Persist the drag offset. Called once per drag, not per pointer move. */
function savePanelOffset(offset) {
  var profile = appState.profile
  profile.ui = Object.assign({}, profile.ui, { panelOffset: { x: offset.x, y: offset.y } })
  writeStorage(profile)
}

/** Reset the panel to its centred default. */
function resetPanelOffset() {
  var profile = appState.profile
  profile.ui = Object.assign({}, profile.ui, { panelOffset: { x: 0, y: 0 } })
  writeStorage(profile)
  setState({ panelOffset: { x: 0, y: 0 } })
}

/**
 * Clamp an offset so every edge of the sheet stays inside the viewport.
 *
 * The offset is a delta from centre, so the bound is the slack between the
 * viewport and the sheet on each axis, minus {@link PANEL_EDGE_GAP}. When the
 * sheet is as large as the viewport allows, the slack collapses to zero and the
 * panel simply stops moving on that axis.
 *
 * @param {{x: number, y: number}} offset - the requested offset.
 * @param {number} width - the sheet's rendered width.
 * @param {number} height - the sheet's rendered height.
 * @returns {{x: number, y: number}} the clamped offset.
 */
function clampPanelOffset(offset, width, height) {
  var maxX = Math.max(0, (window.innerWidth - width) / 2 - PANEL_EDGE_GAP)
  var maxY = Math.max(0, (window.innerHeight - height) / 2 - PANEL_EDGE_GAP)
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  }
}


/* ------------------------------------------------------------------ *
 * Learner actions
 * ------------------------------------------------------------------ */

/** Record one graded review of an entry. */
function gradeEntry(entry, grade) {
  var profile = appState.profile
  var now = Date.now()
  var next = gradeCard(profile.progress[entry.key], grade, now)
  profile.progress = Object.assign({}, profile.progress)
  profile.progress[entry.key] = next
  profile.log = logActivity(profile.log, {
    at: now,
    kind: 'review',
    key: entry.key,
    word: entry.word,
    grade: grade,
  })
  saveProfile(profile)
  return next
}

/** Record a spelling attempt. */
function recordSpelling(entry, ok) {
  var profile = appState.profile
  var now = Date.now()
  var next = gradeCard(profile.progress[entry.key], ok ? 'good' : 'again', now)
  profile.progress = Object.assign({}, profile.progress)
  profile.progress[entry.key] = next
  profile.log = logActivity(profile.log, {
    at: now,
    kind: 'spell',
    key: entry.key,
    word: entry.word,
    ok: ok,
  })
  saveProfile(profile)
}

/** Record one quiz answer. */
function recordQuiz(entry, ok) {
  var profile = appState.profile
  var now = Date.now()
  var next = gradeCard(profile.progress[entry.key], ok ? 'good' : 'again', now)
  profile.progress = Object.assign({}, profile.progress)
  profile.progress[entry.key] = next
  profile.log = logActivity(profile.log, {
    at: now,
    kind: 'quiz',
    key: entry.key,
    word: entry.word,
    ok: ok,
  })
  saveProfile(profile)
}

/** Toggle the star on one entry. */
function toggleStar(key) {
  var profile = appState.profile
  var starred = Object.assign({}, profile.starred)
  if (starred[key]) delete starred[key]
  else starred[key] = Date.now()
  profile.starred = starred
  saveProfile(profile)
}

/** Change one preference. */
function setSetting(name, value) {
  var profile = appState.profile
  profile.settings = Object.assign({}, profile.settings, { [name]: value })
  saveProfile(profile)
}

/** Wipe every trace of progress, keeping the preferences. */
function resetProgress() {
  var profile = appState.profile
  profile.progress = {}
  profile.log = []
  profile.starred = {}
  saveProfile(profile)
  setState({ session: null, quiz: null, spell: null })
}

/* ------------------------------------------------------------------ *
 * Session builders
 * ------------------------------------------------------------------ */

/**
 * Start the next learning set: the following `sessionSize` words from the deck.
 *
 * There is no group to choose. Each set advances through the library in order,
 * and when the library runs out the set is filled from whatever is due, so
 * "learn" never becomes a dead end.
 */
function startLearnSession() {
  var profile = appState.profile
  var size = profile.settings.sessionSize || 20
  var queue = nextBatch(size, Date.now())
  setState({
    session: {
      kind: 'learn',
      entries: queue,
      index: 0,
      grades: {},
      done: queue.length === 0,
      /** How many of these words were already due for review rather than new. */
      fromReview: queue.filter(function (entry) { return isSeen(profile.progress[entry.key]) }).length,
    },
  })
  rememberUi('learn')
}

/** Build the review queue from everything currently due. */
function startReviewSession() {
  var profile = appState.profile
  var now = Date.now()
  var size = profile.settings.sessionSize || 20
  var queue = buildReviewQueue(ENTRIES, profile.progress, now, size)
  setState({
    session: { kind: 'review', entries: queue, index: 0, grades: {}, done: queue.length === 0 },
  })
  rememberUi('review')
}

/**
 * Build the spelling queue.
 *
 * Spelling drills words the learner has already met, so it draws from the
 * studied set and falls back to the head of the deck for a brand-new profile.
 */
function startSpellSession() {
  var profile = appState.profile
  var now = Date.now()
  var size = profile.settings.sessionSize || 20
  var studied = studiedEntries()
  var pool = studied.length > 0 ? studied : ENTRIES
  var due = []
  var rest = []
  for (var i = 0; i < pool.length; i += 1) {
    var progress = profile.progress[pool[i].key]
    if (isSeen(progress) && progress.due <= now) due.push(pool[i])
    else rest.push(pool[i])
  }
  var queue = due.concat(rest).slice(0, size)
  setState({
    spell: { entries: queue, index: 0, input: '', result: null, hint: 0, right: 0, done: queue.length === 0 },
  })
  rememberUi('spell')
}

/**
 * Build one quiz round from words the learner has already met.
 * @param {number} count - number of questions.
 */
function startQuizSession(count) {
  var profile = appState.profile
  var seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0
  // A quiz is a test, not a first exposure, so it draws from the studied words
  // and only widens to the whole deck when there are too few of them.
  var learned = studiedEntries()
  var source = learned.length >= 4 ? learned : ENTRIES
  var questions = buildQuiz(source, ENTRIES, count, seed)
  setState({
    quiz: { questions: questions, index: 0, chosen: null, right: 0, wrong: [], done: questions.length === 0 },
  })
  rememberUi('quiz')
}

/* ------------------------------------------------------------------ *
 * Styles
 * ------------------------------------------------------------------ */

var CSS = [
  // Panel geometry lives here so the whole surface can be resized in one place.
  // The defaults keep the sheet to roughly a study card: 700x500 is about half
  // of a 1280x840 window, which is small enough to feel like a panel rather than
  // an app, but still fits a word, its meaning and a grade row without scrolling.
  //
  // The variables are declared on BOTH `.el-overlay` and `.el-root` on purpose:
  // `.el-root` sits *inside* `.el-sheet`, and custom properties only inherit
  // downwards, so a declaration on `.el-root` alone would never reach the sheet
  // that reads `--el-sheet-w`. `.el-overlay` covers the sheet and header, and
  // `.el-root` covers the settings page, which has no overlay ancestor.
  '.el-overlay,.el-root{--el-radius:12px;--el-gap:8px;--el-alpha:1;--el-sheet-w:700px;--el-sheet-h:500px;--el-card-pad:18px 20px;--el-word:30px;--el-meaning:18px;}',
  '.el-root{color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6;}',
  '.el-root *{box-sizing:border-box;}',
  // The overlay mode makes `.el-root` a flex column that fills the sheet, so the
  // tab strip keeps its natural height and `.el-body` gets the remainder and
  // scrolls inside it. `min-height:0` is required: a flex item's automatic
  // minimum is its content size, which would let the body grow past the sheet
  // and be clipped by `overflow:hidden` instead of scrolling.
  '.el-fill{flex:1;min-height:0;display:flex;flex-direction:column;}',
  '.el-inline{padding:4px 0 24px;}',
  // The shell's overlay layer is click-through by design, and this surface now
  // stays that way: the panel is non-modal so the learner can keep chatting with
  // the agent beside it. The backdrop therefore paints nothing and captures no
  // pointer events — only the sheet itself opts back in.
  '.el-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:var(--el-gap);pointer-events:none;}',
  // The viewport guards subtract both copies of the gap, so the sheet is never
  // larger than the range the drag clamp allows it to move within.
  //
  // `--el-alpha` carries the opacity preference. It is applied to the surfaces
  // only — sheet, header, cards, rows — while every text colour stays fully
  // opaque, so a see-through panel is still readable. `--el-alpha` defaults to 1
  // and is overwritten on the sheet element from the stored setting.
  '.el-sheet{width:min(var(--el-sheet-w),100vw - 2*var(--el-gap));height:min(var(--el-sheet-h),100vh - 2*var(--el-gap));display:flex;flex-direction:column;background:color-mix(in srgb,var(--dsw-alias-bg-base) calc(var(--el-alpha) * 100%),transparent);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.5);pointer-events:auto;}',
  // Dragging: the sheet is offset from its centred position with a transform,
  // which keeps layout untouched and stays GPU-composited. `will-change` is set
  // only while dragging so idle panels do not hold a layer.
  '.el-sheet.dragging{transition:none;will-change:transform;user-select:none;}',
  '.el-sheet.settling{transition:transform .16s ease-out;}',
  '.el-head{cursor:grab;touch-action:none;display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) calc(var(--el-alpha) * 100%),transparent);flex:none;}',
  '.el-head.dragging{cursor:grabbing;}',
  // Controls inside the header must not start a drag when clicked.
  '.el-head button,.el-head a,.el-head input{cursor:pointer;}',
  '.el-grip{color:var(--dsw-alias-label-secondary);font-size:13px;letter-spacing:-2px;opacity:.55;flex:none;user-select:none;}',
  '.el-head:hover .el-grip{opacity:.9;}',
  '.el-title{font-size:14px;font-weight:650;letter-spacing:.01em;}',
  '.el-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
  '.el-spacer{flex:1;}',
  '.el-iconbtn{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:8px;padding:4px 10px;cursor:pointer;font-size:12.5px;line-height:1.4;}',
  '.el-iconbtn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);}',
  '.el-tabs{display:flex;gap:2px;padding:8px 14px 0;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;flex-wrap:wrap;}',
  '.el-tab{border:none;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 12px;border-radius:8px 8px 0 0;cursor:pointer;font-size:13px;border-bottom:2px solid transparent;}',
  '.el-tab:hover{color:var(--dsw-alias-label-primary);}',
  '.el-tab.on{color:var(--dsw-alias-brand-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600;}',
  // The body is the only scroll container in the panel. It needs its own
  // `min-height:0` as a flex child, and `overscroll-behavior` stops a scroll
  // that reaches the end from chaining out to the page behind the panel.
  '.el-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:16px 18px 28px;}',
  // A visible scrollbar: with the panel now translucent, an invisible scrollbar
  // makes the content look truncated rather than scrollable.
  '.el-body::-webkit-scrollbar{width:10px;}',
  '.el-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:99px;border:3px solid transparent;background-clip:content-box;}',
  '.el-body::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-secondary);background-clip:content-box;}',
  '.el-body::-webkit-scrollbar-track{background:transparent;}',
  '.el-body{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent;}',
  '.el-btn{border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) calc(var(--el-alpha) * 100%),transparent);color:var(--dsw-alias-label-primary);border-radius:9px;padding:7px 13px;cursor:pointer;font-size:13px;}',
  '.el-btn:hover{border-color:var(--dsw-alias-border-l2);}',
  '.el-btn:disabled{opacity:.45;cursor:default;}',
  '.el-btn.primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff;font-weight:600;}',
  '.el-btn.ghost{background:transparent;}',
  '.el-btn.sm{padding:4px 10px;font-size:12px;border-radius:7px;}',
  '.el-bar{height:5px;border-radius:99px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) calc(var(--el-alpha) * 100%),transparent);overflow:hidden;}',
  '.el-bar>i{display:block;height:100%;background:var(--dsw-alias-brand-primary);border-radius:99px;transition:width .25s;}',
  '.el-card{border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) calc(var(--el-alpha) * 100%),transparent);border-radius:13px;padding:var(--el-card-pad);}',
  '.el-cardhead{display:flex;align-items:center;gap:9px;margin-bottom:4px;flex-wrap:wrap;}',
  '.el-word{font-size:var(--el-word);font-weight:680;letter-spacing:-.015em;line-height:1.15;}',
  '.el-ipa{font-family:"Segoe UI",system-ui,sans-serif;font-size:15px;color:var(--dsw-alias-brand-primary);}',
  '.el-pos{font-size:11.5px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:1px 6px;}',
  '.el-badge{font-size:11px;border-radius:99px;padding:1px 8px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);}',
  '.el-badge.new{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary);}',
  '.el-badge.due{border-color:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary);}',
  '.el-meaning{font-size:var(--el-meaning);font-weight:600;margin:10px 0 2px;}',
  '.el-sect{margin-top:14px;padding-top:12px;border-top:1px dashed var(--dsw-alias-border-l1);}',
  '.el-sect>h4{margin:0 0 8px;font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}',
  '.el-ph{display:flex;gap:9px;align-items:baseline;padding:3px 0;font-size:13.5px;}',
  '.el-ph>b{font-weight:600;color:var(--dsw-alias-label-primary);}',
  '.el-ph>span{color:var(--dsw-alias-label-secondary);font-size:12.5px;}',
  '.el-ex{padding:6px 0;font-size:14px;}',
  '.el-ex>p{margin:0;}',
  '.el-ex>p+ p{margin-top:2px;}',
  '.el-ex .cn{color:var(--dsw-alias-label-secondary);font-size:13px;}',
  '.el-ex .en{cursor:pointer;}',
  '.el-ex .en:hover{color:var(--dsw-alias-brand-primary);}',
  '.el-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;align-items:center;}',
  '.el-grades{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px;margin-top:14px;}',
  '.el-grade{border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) calc(var(--el-alpha) * 100%),transparent);border-radius:9px;padding:8px 6px;cursor:pointer;display:flex;flex-direction:column;gap:2px;align-items:center;}',
  '.el-grade:hover{border-color:var(--dsw-alias-brand-primary);}',
  '.el-grade>b{font-size:13px;font-weight:620;}',
  '.el-grade>span{font-size:11px;color:var(--dsw-alias-label-secondary);}',
  '.el-grade.again:hover{border-color:var(--dsw-alias-state-error-primary);}',
  '.el-grade.easy:hover{border-color:var(--dsw-alias-state-success-primary);}',
  '.el-hidden{filter:blur(9px);user-select:none;cursor:pointer;}',
  '.el-input{width:100%;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) calc(var(--el-alpha) * 100%),transparent);color:var(--dsw-alias-label-primary);border-radius:9px;padding:10px 13px;font-size:20px;letter-spacing:.06em;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;outline:none;}',
  '.el-input:focus{border-color:var(--dsw-alias-brand-primary);}',
  '.el-mask{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:22px;letter-spacing:.22em;color:var(--dsw-alias-label-secondary);}',
  '.el-marks{display:flex;flex-wrap:wrap;gap:2px;margin-top:10px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:20px;}',
  '.el-marks span{border-radius:5px;padding:1px 5px;}',
  '.el-marks .ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 22%,transparent);color:var(--dsw-alias-state-success-primary);}',
  '.el-marks .no{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent);color:var(--dsw-alias-state-error-primary);text-decoration:line-through;}',
  '.el-opt{display:block;width:100%;text-align:left;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) calc(var(--el-alpha) * 100%),transparent);color:var(--dsw-alias-label-primary);border-radius:9px;padding:10px 13px;margin-top:8px;cursor:pointer;font-size:14px;}',
  '.el-opt:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary);}',
  '.el-opt.right{border-color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);}',
  '.el-opt.wrong{border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);}',
  '.el-note{color:var(--dsw-alias-label-secondary);font-size:12.5px;}',
  '.el-good{color:var(--dsw-alias-state-success-primary);font-weight:600;}',
  '.el-bad{color:var(--dsw-alias-state-error-primary);font-weight:600;}',
  '.el-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:9px;margin-bottom:16px;}',
  '.el-stat{border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) calc(var(--el-alpha) * 100%),transparent);border-radius:11px;padding:10px 12px;}',
  '.el-stat>span{display:block;font-size:11.5px;color:var(--dsw-alias-label-secondary);}',
  '.el-stat>b{display:block;font-size:20px;font-weight:680;margin-top:2px;}',
  '.el-row{display:flex;align-items:center;gap:11px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l1);}',
  '.el-row:last-child{border-bottom:none;}',
  '.el-row .grow{flex:1;min-width:0;}',
  '.el-list{border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) calc(var(--el-alpha) * 100%),transparent);padding:4px 13px;margin-top:13px;}',
  // The toast is deliberately NOT faded with the rest: it is a transient
  // notification that floats above the panel, and a half-transparent notice over
  // an already-transparent panel would be unreadable.
  '.el-toast{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);border-radius:9px;padding:7px 13px;font-size:12.5px;box-shadow:0 10px 30px rgba(0,0,0,.28);}',
  '.el-center{text-align:center;padding:32px 16px;}',
  '.el-center>h3{margin:0 0 6px;font-size:17px;}',
  '.el-tag{display:inline-block;font-size:11px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:5px;padding:0 5px;margin-left:5px;}',
  '.el-star{cursor:pointer;background:none;border:none;font-size:15px;line-height:1;padding:2px 4px;color:var(--dsw-alias-label-secondary);}',
  '.el-star.on{color:#e8b339;}',
  '.el-progressline{height:4px;border-radius:99px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) calc(var(--el-alpha) * 100%),transparent);overflow:hidden;margin-bottom:13px;}',
  '.el-progressline>i{display:block;height:100%;background:var(--dsw-alias-brand-primary);transition:width .25s;}',
  '.el-speak{border:1px solid var(--dsw-alias-border-l1);background:transparent;border-radius:8px;width:29px;height:29px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dsw-alias-brand-primary);font-size:13px;flex:none;}',
  '.el-speak:hover{border-color:var(--dsw-alias-brand-primary);}',
  '.el-field{display:flex;align-items:center;gap:10px;padding:7px 0;}',
  '.el-field>label{flex:1;font-size:13px;}',
  '.el-field select,.el-field input[type=number]{border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) calc(var(--el-alpha) * 100%),transparent);color:var(--dsw-alias-label-primary);border-radius:8px;padding:5px 9px;font-size:13px;}',
  '.el-field input[type=range]{width:130px;accent-color:var(--dsw-alias-brand-primary);}',
  '.el-flex{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}',
  // Narrow windows: the size guards above already shrink the sheet to the
  // viewport minus the edge gap, so only the type scale needs adjusting here.
  // These selectors match `.el-overlay` too, for the same inheritance reason.
  '@media (max-width:980px){.el-overlay,.el-root{--el-word:28px;--el-meaning:17px;--el-card-pad:16px 16px;}}',
  // Very narrow: the grade buttons would shrink below a usable tap target, so
  // drop to two per row instead of four across.
  '@media (max-width:640px){.el-overlay,.el-root{--el-gap:6px;--el-word:25px;}.el-sheet{border-radius:10px;}.el-grades{grid-template-columns:repeat(2,1fr);}.el-body{padding:12px 12px 22px;}.el-tabs{padding:6px 10px 0;}.el-head{padding:7px 10px;}.el-stat>b{font-size:17px;}}',
].join('\n')

/** Insert the stylesheet once and hand back its disposer. */
function injectStyles(css) {
  var element = document.createElement('style')
  element.setAttribute('data-dsh-english-learn', '')
  element.textContent = css
  document.head.appendChild(element)
  return function disposeStyles() {
    try {
      element.remove()
    } catch (error) {
      /* already detached */
    }
  }
}

/* ------------------------------------------------------------------ *
 * Small components
 * ------------------------------------------------------------------ */

var h = react.createElement

/** Speaker button that reads one English string aloud. */
function SpeakButton(props) {
  return h('button', {
    type: 'button',
    className: 'el-speak',
    title: tr('action.speak'),
    'aria-label': tr('action.speak'),
    onClick: function onSpeak(event) {
      event.stopPropagation()
      speak(props.text)
    },
  }, '\u25B6')
}

/** Horizontal progress bar. */
function Bar(props) {
  var pct = props.total > 0 ? Math.round((props.done / props.total) * 100) : 0
  return h('div', { className: 'el-bar' }, h('i', { style: { width: pct + '%' } }))
}

/** The word card shared by the Learn and Review surfaces. */
function WordCard(props) {
  var entry = props.entry
  var progress = appState.profile.progress[entry.key]
  var isNew = progress === undefined || progress.seen === 0
  var starred = appState.profile.starred[entry.key] !== undefined
  // When the "hide the meaning first" preference is on, the meaning starts
  // blurred and one click reveals it. The caller keys this component by word,
  // so the state resets on every card.
  var hideFirst = appState.profile.settings.hideMeaning === true
  var revealState = react.useState(!hideFirst)
  var revealed = revealState[0]
  var setRevealed = revealState[1]
  var blurred = hideFirst && !revealed

  react.useEffect(function () {
    if (props.autoSpeak !== false) speak(entry.word)
  }, [entry.key])

  return h('div', { className: 'el-card' },
    h('div', { className: 'el-cardhead' },
      h('span', { className: 'el-word' }, entry.word),
      h(SpeakButton, { text: entry.word }),
      h('span', { className: 'el-ipa' }, entry.ipa),
      h('span', { className: 'el-pos' }, entry.pos),
      isNew ? h('span', { className: 'el-badge new' }, tr('learn.newWord')) : null,
      !isNew && progress.due <= Date.now() ? h('span', { className: 'el-badge due' }, tr('learn.dueWord')) : null,
      h('span', { className: 'el-spacer', style: { flex: 1 } }),
      h('button', {
        type: 'button',
        className: 'el-star' + (starred ? ' on' : ''),
        title: 'star',
        onClick: function onStar() { toggleStar(entry.key) },
      }, starred ? '\u2605' : '\u2606')
    ),
    h('div', {
      className: blurred ? 'el-hidden' : '',
      onClick: blurred ? function reveal() { setRevealed(true) } : undefined,
    }, h('div', { className: 'el-meaning' }, entry.cn)),
    blurred ? h('div', { className: 'el-note', style: { marginTop: 6 } }, tr('learn.reveal')) : null,
    blurred ? null : h('div', null,
      entry.phrases.length > 0 ? h('div', { className: 'el-sect' },
        h('h4', null, tr('card.phrases')),
        entry.phrases.map(function phrase(item, index) {
          return h('div', { className: 'el-ph', key: 'p' + index },
            h('b', { className: 'el-en', style: { cursor: 'pointer' }, onClick: function onSpeak() { speak(item.en) } }, item.en),
            h('span', null, item.cn))
        })
      ) : null,
      entry.examples.length > 0 ? h('div', { className: 'el-sect' },
        h('h4', null, tr('card.examples')),
        entry.examples.map(function example(item, index) {
          return h('div', { className: 'el-ex', key: 'e' + index },
            h('p', { className: 'en', onClick: function onSpeak() { speak(item.en) } }, item.en),
            h('p', { className: 'cn' }, item.cn))
        })
      ) : null
    )
  )
}

/** The four grading buttons with their resulting intervals. */
function GradeRow(props) {
  var entry = props.entry
  var current = appState.profile.progress[entry.key]
  var now = Date.now()
  var labels = { again: tr('grade.again'), hard: tr('grade.hard'), good: tr('grade.good'), easy: tr('grade.easy') }
  return h('div', { className: 'el-grades' },
    GRADES.map(function gradeButton(grade) {
      var preview = gradeCard(current, grade, now)
      return h('button', {
        key: grade,
        type: 'button',
        className: 'el-grade ' + grade,
        onClick: function onGrade() { props.onGrade(grade) },
      },
        h('b', null, labels[grade]),
        h('span', null, intervalLabel(preview.interval)))
    })
  )
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

/** Library progress summary plus the start control, shared by the surfaces. */
function LibraryBar(props) {
  var profile = appState.profile
  var now = Date.now()
  var stats = summarize(ENTRIES, profile.progress, now)
  var learned = ENTRIES.length - stats.fresh
  var size = profile.settings.sessionSize || 20
  var remaining = freshCount()
  return h('div', null,
    h('div', { className: 'el-flex', style: { marginBottom: 8 } },
      h('span', { className: 'el-note' }, tr('learn.progress', { done: learned, total: ENTRIES.length })),
      h('span', { className: 'el-spacer', style: { flex: 1 } }),
      h('span', { className: 'el-note' }, remaining > 0 ? tr('learn.remaining', { n: remaining }) : tr('learn.allDone'))),
    h(Bar, { done: learned, total: ENTRIES.length }),
    h('div', { className: 'el-note', style: { marginTop: 8 } }, tr('learn.sessionHint', { n: size }))
  )
}

/**
 * The library view: every word in the deck, in study order.
 *
 * The deck is a single sequence, so this is a reference list rather than a menu
 * of categories — the origin label is shown only to explain where a word sits.
 */
function LibraryList(props) {
  var state = useAppState()
  var profile = state.profile
  var showAll = state.showAll === true
  var list = showAll ? ENTRIES : ENTRIES.slice(0, 40)
  return h('div', null,
    h('div', { className: 'el-list' },
      list.map(function wordRow(entry) {
        var progress = profile.progress[entry.key]
        var known = isSeen(progress)
        return h('div', { className: 'el-row', key: entry.key },
          h('div', { className: 'grow' },
            h('div', null,
              h('b', null, entry.word),
              h('span', { className: 'el-ipa', style: { marginLeft: 8, fontSize: 13 } }, entry.ipa),
              h('span', { className: 'el-tag' }, entry.pos),
              h('span', { className: 'el-tag' }, entry.origin),
              known ? h('span', { className: 'el-tag' }, intervalLabel(progress.interval)) : h('span', { className: 'el-tag' }, tr('stats.fresh'))),
            h('div', { className: 'el-note' }, entry.cn + ' \u00B7 ' + (entry.phrases[0] ? entry.phrases[0].en : ''))),
          h(SpeakButton, { text: entry.word }))
      })),
    ENTRIES.length > 40 ? h('div', { className: 'el-actions' },
      h('button', {
        type: 'button',
        className: 'el-btn ghost',
        onClick: function toggle() { setState({ showAll: !showAll }) },
      }, showAll ? tr('learn.hideLibrary') : tr('learn.library') + ' (' + ENTRIES.length + ')')) : null
  )
}

/**
 * The Learn surface: one 20-word set at a time.
 *
 * There is no group to choose. Pressing start takes the next `sessionSize` words
 * from the deck; finishing the set offers the following one, so study continues
 * straight through the library.
 */
function LearnTab(props) {
  var state = useAppState()
  var session = state.session
  var profile = state.profile
  var size = profile.settings.sessionSize || 20
  var now = Date.now()

  // Idle: show the library summary and the start control.
  if (session === null || session.kind !== 'learn') {
    var queue = nextBatch(size, now)
    var stats = summarize(ENTRIES, profile.progress, now)
    if (ENTRIES.length === 0) {
      return h('div', { className: 'el-center' }, h('h3', null, tr('learn.allDone')))
    }
    return h('div', null,
      h(LibraryBar, null),
      h('div', { className: 'el-actions', style: { marginTop: 18 } },
        h('button', {
          type: 'button',
          className: 'el-btn primary',
          disabled: queue.length === 0,
          onClick: startLearnSession,
        }, queue.length === 0
          ? tr('learn.allDone')
          : tr('learn.startBatch', { n: queue.length })),
        stats.due > 0 ? h('button', {
          type: 'button',
          className: 'el-btn',
          onClick: function toReview() { setState({ tab: 'review' }); startReviewSession() },
        }, tr('learn.reviewDue', { n: stats.due })) : null,
        h('button', {
          type: 'button',
          className: 'el-btn ghost',
          onClick: function toLib() { setState({ tab: 'stats' }) },
        }, tr('learn.library'))),
      h(LibraryList, null)
    )
  }

  // Finished the set: offer the next one rather than sending the learner back.
  if (session.done) {
    var next = nextBatch(size, now)
    return h('div', { className: 'el-center' },
      h('h3', null, '\uD83C\uDF89 ' + tr('learn.batchDone', { n: session.entries.length })),
      h('div', { className: 'el-note' }, freshCount() > 0
        ? tr('learn.remaining', { n: freshCount() })
        : tr('learn.allDone')),
      h('div', { className: 'el-actions', style: { justifyContent: 'center' } },
        h('button', {
          type: 'button',
          className: 'el-btn primary',
          disabled: next.length === 0,
          onClick: startLearnSession,
        }, next.length === 0 ? tr('learn.allDone') : tr('learn.nextBatch', { n: next.length })),
        h('button', {
          type: 'button',
          className: 'el-btn',
          onClick: function toReview() { setState({ tab: 'review' }); startReviewSession() },
        }, tr('tab.review')),
        h('button', {
          type: 'button',
          className: 'el-btn ghost',
          onClick: function back() { setState({ session: null }) },
        }, tr('action.back'))))
  }

  var entry = session.entries[session.index]
  var total = session.entries.length
  return h('div', null,
    h('div', { className: 'el-flex', style: { marginBottom: 12 } },
      h('button', { type: 'button', className: 'el-btn sm ghost', onClick: function back() { setState({ session: null }) } }, '\u2190 ' + tr('action.back')),
      h('span', { className: 'el-note' }, tr('learn.batchOf', { i: session.index + 1, n: total })),
      h('span', { className: 'el-spacer', style: { flex: 1 } }),
      session.fromReview > 0 ? h('span', { className: 'el-note' }, tr('learn.dueWord') + ' \u00D7 ' + session.fromReview) : null),
    h('div', { className: 'el-progressline' }, h('i', { style: { width: Math.round((session.index / total) * 100) + '%' } })),
    h(WordCard, {
      key: entry.key,
      entry: entry,
      autoSpeak: profile.settings.autoSpeak,
    }),
    h(GradeRow, {
      entry: entry,
      onGrade: function onGrade(grade) {
        gradeEntry(entry, grade)
        var nextIndex = session.index + 1
        var done = nextIndex >= session.entries.length
        setState({
          session: Object.assign({}, session, {
            index: done ? session.index : nextIndex,
            done: done,
            grades: Object.assign({}, session.grades, { [entry.key]: grade }),
          }),
        })
      },
    })
  )
}

/** The Spelling surface. */
function SpellTab(props) {
  var state = useAppState()
  var spell = state.spell
  var profile = state.profile
  var studied = studiedEntries().length

  if (spell === null) {
    return h('div', null,
      h(LibraryBar, null),
      h('div', { className: 'el-actions', style: { marginTop: 18 } },
        h('button', {
          type: 'button',
          className: 'el-btn primary',
          onClick: startSpellSession,
        }, tr('learn.startBatch', { n: Math.min(profile.settings.sessionSize || 20, studied > 0 ? studied : ENTRIES.length) }))),
      h('div', { className: 'el-note', style: { marginTop: 10 } },
        studied > 0 ? tr('spell.prompt') : tr('learn.needWords')))
  }

  if (spell.done) {
    return h('div', { className: 'el-center' },
      h('h3', null, '\u270D\uFE0F ' + tr('learn.finished', { n: spell.entries.length })),
      h('div', { className: 'el-note' }, tr('quiz.result', {
        right: spell.right,
        total: spell.entries.length,
        pct: spell.entries.length === 0 ? 0 : Math.round((spell.right / spell.entries.length) * 100),
      })),
      h('div', { className: 'el-actions', style: { justifyContent: 'center' } },
        h('button', { type: 'button', className: 'el-btn primary', onClick: startSpellSession }, tr('action.restart')),
        h('button', { type: 'button', className: 'el-btn ghost', onClick: function back() { setState({ spell: null }) } }, tr('action.back'))))
  }

  var entry = spell.entries[spell.index]
  var result = spell.result
  var hintCap = Math.max(0, entry.word.replace(/ /g, '').length - 2)

  return h('div', null,
    h('div', { className: 'el-flex', style: { marginBottom: 12 } },
      h('button', { type: 'button', className: 'el-btn sm ghost', onClick: function back() { setState({ spell: null }) } }, '\u2190 ' + tr('action.back')),
      h('span', { className: 'el-note' }, tr('spell.title')),
      h('span', { className: 'el-spacer', style: { flex: 1 } }),
      h('span', { className: 'el-note' }, (spell.index + 1) + ' / ' + spell.entries.length)),
    h('div', { className: 'el-progressline' }, h('i', { style: { width: Math.round((spell.index / spell.entries.length) * 100) + '%' } })),
    h('div', { className: 'el-card' },
      h('div', { className: 'el-note' }, tr('spell.prompt')),
      h('div', { className: 'el-meaning' }, entry.cn),
      h('div', { className: 'el-flex' },
        h('span', { className: 'el-ipa' }, entry.ipa),
        h('span', { className: 'el-pos' }, entry.pos),
        h(SpeakButton, { text: entry.word })),
      h('div', { className: 'el-sect' },
        h('div', { className: 'el-mask' }, maskWord(entry.word, spell.hint)),
        h('input', {
          className: 'el-input',
          style: { marginTop: 14 },
          value: spell.input,
          placeholder: tr('spell.placeholder'),
          autoComplete: 'off',
          autoCapitalize: 'off',
          spellCheck: false,
          disabled: result !== null,
          onChange: function onChange(event) { setState({ spell: Object.assign({}, spell, { input: event.target.value }) }) },
          onKeyDown: function onKeyDown(event) {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (result === null) submitSpell()
              else advanceSpell()
            }
          },
        }),
        result !== null ? h('div', { className: 'el-marks' },
          result.marks.map(function markSpan(mark, index) {
            return h('span', { key: index, className: mark.ok ? 'ok' : 'no' }, mark.char)
          })) : null,
        result !== null
          ? h('div', { style: { marginTop: 12 } },
              result.ok
                ? h('span', { className: 'el-good' }, '\u2713 ' + tr('spell.correct'))
                : h('span', { className: 'el-bad' }, '\u2717 ' + tr('spell.wrong', { word: entry.word })))
          : null,
        h('div', { className: 'el-actions' },
          result === null ? h('button', { type: 'button', className: 'el-btn primary', disabled: spell.input.trim() === '', onClick: submitSpell }, tr('action.check')) : null,
          result === null ? h('button', {
            type: 'button',
            className: 'el-btn',
            disabled: spell.hint >= hintCap,
            onClick: function hint() { setState({ spell: Object.assign({}, spell, { hint: spell.hint + 1 }) }) },
          }, tr('action.hint') + ' (' + spell.hint + '/' + hintCap + ')') : null,
          result === null ? h('button', {
            type: 'button',
            className: 'el-btn ghost',
            onClick: function reveal() {
              var check = checkSpelling('', entry.word)
              recordSpelling(entry, false)
              setState({ spell: Object.assign({}, spell, { result: check, input: '' }) })
            },
          }, tr('spell.reveal')) : null,
          result !== null ? h('button', { type: 'button', className: 'el-btn primary', onClick: advanceSpell }, tr('action.next') + ' \u2192') : null)))
  )

  function submitSpell() {
    var check = checkSpelling(spell.input, entry.word)
    recordSpelling(entry, check.ok)
    setState({
      spell: Object.assign({}, spell, {
        result: check,
        right: spell.right + (check.ok ? 1 : 0),
      }),
    })
    if (check.ok) speak(entry.word)
  }

  function advanceSpell() {
    var nextIndex = spell.index + 1
    var done = nextIndex >= spell.entries.length
    setState({
      spell: Object.assign({}, spell, {
        index: done ? spell.index : nextIndex,
        input: '',
        result: null,
        hint: 0,
        done: done,
      }),
    })
  }
}

/** The Quiz surface. */
function QuizTab(props) {
  var state = useAppState()
  var quiz = state.quiz
  var profile = state.profile
  var studied = studiedEntries().length

  if (quiz === null) {
    return h('div', null,
      h(LibraryBar, null),
      h('div', { className: 'el-actions', style: { marginTop: 18 } },
        [5, 10, 20].map(function countButton(count) {
          return h('button', {
            key: count,
            type: 'button',
            className: 'el-btn' + (count === 10 ? ' primary' : ''),
            disabled: studied < 4,
            onClick: function start() { startQuizSession(count) },
          }, tr('quiz.start') + ' \u00B7 ' + count)
        })),
      h('div', { className: 'el-note', style: { marginTop: 10 } },
        studied >= 4
          ? tr('quiz.pool', { n: studied })
          : tr('learn.needWords')))
  }

  if (quiz.done) {
    var total = quiz.questions.length
    return h('div', null,
      h('div', { className: 'el-center' },
        h('h3', null, tr('quiz.done')),
        h('div', { className: 'el-meaning' }, tr('quiz.result', {
          right: quiz.right,
          total: total,
          pct: total === 0 ? 0 : Math.round((quiz.right / total) * 100),
        })),
        h('div', { className: 'el-actions', style: { justifyContent: 'center' } },
          h('button', { type: 'button', className: 'el-btn primary', onClick: function again() { startQuizSession(total) } }, tr('action.restart')),
          h('button', { type: 'button', className: 'el-btn ghost', onClick: function back() { setState({ quiz: null }) } }, tr('action.back')))),
      quiz.wrong.length > 0 ? h('div', { className: 'el-list' },
        h('div', { className: 'el-note', style: { padding: '10px 0 4px' } }, tr('quiz.wrongList')),
        quiz.wrong.map(function wrongRow(item, index) {
          return h('div', { className: 'el-row', key: index },
            h('div', { className: 'grow' },
              h('b', null, item.word),
              h('span', { className: 'el-ipa', style: { marginLeft: 8, fontSize: 13 } }, item.ipa),
              h('div', { className: 'el-note' }, item.cn)),
            h(SpeakButton, { text: item.word }))
        })) : null
    )
  }

  var question = quiz.questions[quiz.index]
  var chosen = quiz.chosen

  return h('div', null,
    h('div', { className: 'el-flex', style: { marginBottom: 12 } },
      h('button', { type: 'button', className: 'el-btn sm ghost', onClick: function back() { setState({ quiz: null }) } }, '\u2190 ' + tr('action.back')),
      h('span', { className: 'el-note' }, tr('quiz.question', { i: quiz.index + 1, n: quiz.questions.length })),
      h('span', { className: 'el-spacer', style: { flex: 1 } }),
      h('span', { className: 'el-note' }, tr('quiz.score', { score: quiz.right }))),
    h('div', { className: 'el-progressline' }, h('i', { style: { width: Math.round((quiz.index / quiz.questions.length) * 100) + '%' } })),
    h('div', { className: 'el-card' },
      h('div', { className: 'el-flex' },
        h('span', { style: { fontSize: 26, fontWeight: 650 } }, question.prompt),
        question.kind === 'en2cn' ? h(SpeakButton, { text: question.target.word }) : null),
      question.sub !== undefined && question.kind !== 'cloze' ? h('div', { className: 'el-ipa' }, question.sub) : null,
      question.kind === 'cloze' ? h('div', { className: 'el-note' }, question.sub) : null,
      h('div', { style: { marginTop: 16 } },
        question.options.map(function optionButton(option, index) {
          var cls = 'el-opt'
          if (chosen !== null) {
            if (option.correct) cls += ' right'
            else if (index === chosen) cls += ' wrong'
          }
          return h('button', {
            key: index,
            type: 'button',
            className: cls,
            disabled: chosen !== null,
            onClick: function pick() { answer(option, index) },
          }, option.label)
        })),
      chosen !== null ? h('div', { style: { marginTop: 14 } },
        question.options[chosen].correct
          ? h('span', { className: 'el-good' }, '\u2713 ' + tr('quiz.correct'))
          : h('span', { className: 'el-bad' }, '\u2717 ' + tr('quiz.wrong', { answer: question.target.word }))) : null,
      chosen !== null ? h('div', { className: 'el-actions' },
        h('button', { type: 'button', className: 'el-btn primary', onClick: next }, tr('action.next') + ' \u2192')) : null)
  )

  function answer(option, index) {
    if (quiz.chosen !== null) return
    recordQuiz(question.target, option.correct)
    setState({
      quiz: Object.assign({}, quiz, {
        chosen: index,
        right: quiz.right + (option.correct ? 1 : 0),
        wrong: option.correct ? quiz.wrong : quiz.wrong.concat([question.target]),
      }),
    })
  }

  function next() {
    var nextIndex = quiz.index + 1
    var done = nextIndex >= quiz.questions.length
    setState({ quiz: Object.assign({}, quiz, { index: done ? quiz.index : nextIndex, chosen: null, done: done }) })
  }
}

/** The Review surface. */
function ReviewTab(props) {
  var state = useAppState()
  var session = state.session
  var profile = state.profile
  var now = Date.now()
  var stats = summarize(ENTRIES, profile.progress, now)

  if (session === null || session.kind !== 'review') {
    return h('div', null,
      h('div', { className: 'el-stats' },
        h('div', { className: 'el-stat' }, h('span', null, tr('stats.due')), h('b', null, String(stats.due))),
        h('div', { className: 'el-stat' }, h('span', null, tr('stats.learned')), h('b', null, String(stats.total - stats.fresh))),
        h('div', { className: 'el-stat' }, h('span', null, tr('stats.mastered')), h('b', null, String(stats.mastered))),
        h('div', { className: 'el-stat' }, h('span', null, tr('stats.streak')), h('b', null, streakDays(profile.log, now) + ' ' + tr('stats.days')))),
      stats.due + stats.fresh === 0
        ? h('div', { className: 'el-center' }, h('h3', null, tr('review.none')))
        : h('div', { className: 'el-center' },
            h('h3', null, tr('review.due', { n: stats.due })),
            h('div', { className: 'el-note' }, tr('app.subtitle')),
            h('div', { className: 'el-actions', style: { justifyContent: 'center' } },
              h('button', { type: 'button', className: 'el-btn primary', onClick: startReviewSession }, tr('review.start')))))
  }

  if (session.done || session.entries.length === 0) {
    var againCount = 0
    for (var key in session.grades) {
      if (session.grades[key] === 'again') againCount += 1
    }
    return h('div', { className: 'el-center' },
      h('h3', null, '\uD83D\uDD01 ' + tr('review.done', { n: session.entries.length })),
      againCount > 0 ? h('div', { className: 'el-note' }, tr('review.againCount', { n: againCount })) : null,
      h('div', { className: 'el-actions', style: { justifyContent: 'center' } },
        h('button', { type: 'button', className: 'el-btn primary', onClick: startReviewSession }, tr('action.restart')),
        h('button', { type: 'button', className: 'el-btn ghost', onClick: function back() { setState({ session: null }) } }, tr('action.back'))))
  }

  var entry = session.entries[session.index]
  var total = session.entries.length
  return h('div', null,
    h('div', { className: 'el-flex', style: { marginBottom: 12 } },
      h('button', { type: 'button', className: 'el-btn sm ghost', onClick: function back() { setState({ session: null }) } }, '\u2190 ' + tr('action.back')),
      h('span', { className: 'el-note' }, tr('review.title')),
      h('span', { className: 'el-spacer', style: { flex: 1 } }),
      h('span', { className: 'el-note' }, (session.index + 1) + ' / ' + total)),
    h('div', { className: 'el-progressline' }, h('i', { style: { width: Math.round((session.index / total) * 100) + '%' } })),
    h(WordCard, { key: entry.key, entry: entry, autoSpeak: profile.settings.autoSpeak }),
    h(GradeRow, {
      entry: entry,
      onGrade: function onGrade(grade) {
        gradeEntry(entry, grade)
        var nextIndex = session.index + 1
        var done = nextIndex >= session.entries.length
        setState({
          session: Object.assign({}, session, {
            index: done ? session.index : nextIndex,
            done: done,
            grades: Object.assign({}, session.grades, { [entry.key]: grade }),
          }),
        })
      },
    })
  )
}

/** The Progress surface. */
function StatsTab(props) {
  var state = useAppState()
  var profile = state.profile
  var now = Date.now()
  var stats = summarize(ENTRIES, profile.progress, now)
  var recent = profile.log.slice(-14).reverse()

  return h('div', null,
    h('div', { className: 'el-stats' },
      h('div', { className: 'el-stat' }, h('span', null, tr('stats.total')), h('b', null, String(stats.total))),
      h('div', { className: 'el-stat' }, h('span', null, tr('stats.learned')), h('b', null, String(stats.total - stats.fresh))),
      h('div', { className: 'el-stat' }, h('span', null, tr('stats.due')), h('b', null, String(stats.due))),
      h('div', { className: 'el-stat' }, h('span', null, tr('stats.mastered')), h('b', null, String(stats.mastered))),
      h('div', { className: 'el-stat' }, h('span', null, tr('stats.accuracy')), h('b', null, stats.accuracy === 0 ? '\u2014' : Math.round(stats.accuracy * 100) + '%')),
      h('div', { className: 'el-stat' }, h('span', null, tr('stats.streak')), h('b', null, streakDays(profile.log, now) + ' ' + tr('stats.days')))),

    h('h4', { style: { fontSize: 12.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--dsw-alias-label-secondary)' } }, tr('stats.byStage')),
    h('div', { className: 'el-list' },
      GROUPS.map(function groupStat(group) {
        var groupStats = summarize(group.entries, profile.progress, now)
        var learned = group.entries.length - groupStats.fresh
        return h('div', { className: 'el-row', key: group.id },
          h('div', { className: 'grow' },
            h('div', { className: 'el-flex' },
              h('b', null, group.title),
              h('span', { className: 'el-tag' }, group.level),
              h('span', { className: 'el-note' }, learned + '/' + group.entries.length)),
            h('div', { style: { marginTop: 6 } }, h(Bar, { done: learned, total: group.entries.length }))),
          h('span', { className: 'el-note' }, groupStats.accuracy === 0 ? '\u2014' : Math.round(groupStats.accuracy * 100) + '%'))
      })),

    h('h4', { style: { fontSize: 12.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--dsw-alias-label-secondary)', marginTop: 24 } }, tr('stats.recent')),
    recent.length === 0
      ? h('div', { className: 'el-note' }, tr('stats.empty'))
      : h('div', { className: 'el-list' },
          recent.map(function logRow(item, index) {
            var kindLabel = tr('log.' + item.kind)
            var mark = item.grade !== undefined
              ? item.grade
              : (item.ok === true ? 'good' : 'again')
            return h('div', { className: 'el-row', key: index },
              h('span', { className: 'el-tag' }, kindLabel),
              h('div', { className: 'grow' }, h('b', null, item.word)),
              h('span', { className: mark === 'again' ? 'el-bad' : 'el-good' }, mark === 'again' ? tr('grade.again') : tr('grade.good')),
              h('span', { className: 'el-note' }, new Date(item.at).toLocaleString()))
          })),

    h('h4', { style: { fontSize: 12.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--dsw-alias-label-secondary)', marginTop: 24 } }, tr('settings.title')),
    h('div', { className: 'el-list' },
      h('div', { className: 'el-field' },
        h('label', null, tr('settings.sessionSize')),
        h('input', {
          type: 'number', min: 5, max: 50, value: profile.settings.sessionSize,
          onChange: function onChange(event) { setSetting('sessionSize', Math.max(5, Math.min(50, Number(event.target.value) || 20))) },
        })),
      h('div', { className: 'el-field' },
        h('label', null, tr('settings.autoSpeak')),
        h('input', {
          type: 'checkbox', checked: profile.settings.autoSpeak === true,
          onChange: function onChange(event) { setSetting('autoSpeak', event.target.checked) },
        })),
      h('div', { className: 'el-field' },
        h('label', null, tr('settings.accent')),
        h('select', {
          value: profile.settings.accent,
          onChange: function onChange(event) { setSetting('accent', event.target.value) },
        },
          h('option', { value: 'en-GB' }, 'British (en-GB)'),
          h('option', { value: 'en-US' }, 'American (en-US)'),
          h('option', { value: 'en-AU' }, 'Australian (en-AU)'))),
      h('div', { className: 'el-field' },
        h('label', null, tr('settings.hideMeaning')),
        h('input', {
          type: 'checkbox', checked: profile.settings.hideMeaning === true,
          onChange: function onChange(event) { setSetting('hideMeaning', event.target.checked) },
        })),
      // Opacity is a range so the panel can be faded while keeping the chat
      // behind it visible. The label shows the live value, because a bare slider
      // gives no feedback about how transparent the panel actually is.
      h('div', { className: 'el-field' },
        h('label', { htmlFor: 'el-opacity' },
          tr('settings.opacity') + ' \u00B7 ' + Math.round(normalizeOpacity(profile.settings.opacity) * 100) + '%'),
        h('input', {
          id: 'el-opacity',
          type: 'range',
          min: String(Math.round(MIN_OPACITY * 100)),
          max: '100',
          step: '1',
          value: String(Math.round(normalizeOpacity(profile.settings.opacity) * 100)),
          onChange: function onChange(event) { setSetting('opacity', normalizeOpacity(Number(event.target.value) / 100)) },
        }))),
    h('div', { className: 'el-actions' },
      h('button', {
        type: 'button',
        className: 'el-btn',
        onClick: function reset() {
          if (window.confirm(tr('action.resetConfirm'))) resetProgress()
        },
      }, tr('action.reset')))
  )
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

var TABS = ['learn', 'spell', 'quiz', 'review', 'stats']

/** The tab strip plus the active surface; shared by both mount modes. */
function AppBody(props) {
  var state = useAppState()
  var active = state.tab
  var surface = null
  if (active === 'learn') surface = h(LearnTab, null)
  else if (active === 'spell') surface = h(SpellTab, null)
  else if (active === 'quiz') surface = h(QuizTab, null)
  else if (active === 'review') surface = h(ReviewTab, null)
  else surface = h(StatsTab, null)

  // `el-fill` is what makes the body scrollable: without it `.el-root` is a
  // plain block, so `.el-body`'s `flex:1` has nothing to resolve against and the
  // body grows past the sheet, where `overflow:hidden` clips it.
  return h('div', {
    className: 'el-root ' + (props.mode === 'overlay' ? 'el-fill' : 'el-inline'),
  },
    h('div', { className: 'el-tabs' },
      TABS.map(function tabButton(tab) {
        return h('button', {
          key: tab,
          type: 'button',
          className: 'el-tab' + (tab === active ? ' on' : ''),
          onClick: function onTab() {
            setState({ tab: tab, session: null, quiz: null, spell: null })
            rememberUi(tab)
          },
        }, tr('tab.' + tab))
      }),
      h('span', { className: 'el-spacer', style: { flex: 1 } }),
      props.mode === 'overlay'
        ? h('button', { type: 'button', className: 'el-iconbtn', style: { marginBottom: 6 }, onClick: props.onClose }, tr('action.close'))
        : null),
    h('div', { className: 'el-body' }, surface),
    state.toast !== null ? h('div', { className: 'el-toast' }, state.toast) : null
  )
}

/**
 * Full-screen overlay mounted into `shell.overlay`.
 *
 * The panel is draggable by its header. Pointer events are used rather than
 * mouse events so a pen or a touch drag works the same way, and the listeners
 * live on `window` for the duration of a drag so the panel keeps following the
 * pointer even when it passes over the iframe-free but fast-moving backdrop.
 */
function OverlayPanel(props) {
  var state = useAppState()
  var sheetRef = react.useRef(null)
  var dragRef = react.useRef(null)
  var [dragging, setDragging] = react.useState(false)
  var [settling, setSettling] = react.useState(false)

  if (!state.open) return null

  var offset = state.panelOffset || { x: 0, y: 0 }

  /** Current rendered size of the sheet, used for clamping. */
  function sheetSize() {
    var node = sheetRef.current
    if (node === null || node === undefined || node.offsetWidth === 0) {
      return { width: PANEL_WIDTH, height: PANEL_HEIGHT }
    }
    return { width: node.offsetWidth, height: node.offsetHeight }
  }

  function onPointerDown(event) {
    // Left button / primary touch only; ignore right-click and middle-click.
    if (event.button !== undefined && event.button !== 0) return
    // A click on a control inside the header must not start a drag.
    var target = event.target
    while (target !== null && target !== undefined && target !== event.currentTarget) {
      var tag = String(target.tagName || '').toLowerCase()
      if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select') return
      target = target.parentNode
    }
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    }
    setDragging(true)
    setSettling(false)

    function onMove(moveEvent) {
      var drag = dragRef.current
      if (drag === null) return
      var dx = moveEvent.clientX - drag.startX
      var dy = moveEvent.clientY - drag.startY
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
      var size = sheetSize()
      var next = clampPanelOffset({ x: drag.originX + dx, y: drag.originY + dy }, size.width, size.height)
      setState({ panelOffset: next })
    }

    function onUp() {
      var drag = dragRef.current
      dragRef.current = null
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      // Persist once per drag rather than on every pointer move.
      if (drag !== null && drag.moved) {
        savePanelOffset(appState.panelOffset)
        setSettling(true)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  /** Double-clicking the header recentres the panel. */
  function onDoubleClick() {
    resetPanelOffset()
    setSettling(true)
  }

  var sheetClass = 'el-sheet' + (dragging ? ' dragging' : '') + (settling && !dragging ? ' settling' : '')
  var alpha = normalizeOpacity(state.profile.settings.opacity)

  // No click-to-dismiss on the backdrop: the panel is non-modal, so a click
  // beside it belongs to the chat underneath. Closing is explicit — the header
  // button, or the sidebar toggle.
  return h('div', {
    className: 'el-overlay',
    role: 'dialog',
    'aria-label': tr('app.title'),
    'aria-modal': 'false',
  }, h('div', {
    ref: sheetRef,
    className: sheetClass,
    style: {
      transform: 'translate(' + offset.x + 'px, ' + offset.y + 'px)',
      '--el-alpha': String(alpha),
    },
  },
    h('div', {
      className: 'el-head' + (dragging ? ' dragging' : ''),
      onPointerDown: onPointerDown,
      onDoubleClick: onDoubleClick,
      title: tr('panel.dragHint'),
    },
      h('span', { className: 'el-grip', 'aria-hidden': 'true' }, '\u22EE\u22EE'),
      h('div', null,
        h('div', { className: 'el-title' }, '\uD83D\uDCD8 ' + tr('app.title')),
        h('div', { className: 'el-sub' }, tr('app.subtitle'))),
      h('span', { className: 'el-spacer' }),
      h('button', { type: 'button', className: 'el-iconbtn', onClick: function close() { setState({ open: false }) } }, '\u2715 ' + tr('action.close'))),
    h(AppBody, { mode: 'overlay', onClose: function onClose() { setState({ open: false }) } })
  ))
}

/** Sidebar toggle button mounted into `sidebar.footer.action`. */
function SidebarToggle(props) {
  var state = useAppState()
  var label = tr('app.title')
  return h('button', {
    type: 'button',
    className: 'el-root',
    title: tr('panel.open'),
    onClick: function toggle() { setState({ open: !state.open }) },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      border: '1px solid var(--dsw-alias-border-l1)',
      borderRadius: '10px',
      background: state.open ? 'var(--dsw-alias-brand-primary)' : 'transparent',
      color: state.open ? '#fff' : 'var(--dsw-alias-label-secondary)',
      padding: props.wide === false ? '6px' : '7px 12px',
      fontSize: '13px',
      width: props.wide === false ? 'auto' : '100%',
      justifyContent: 'flex-start',
    },
  },
    h('span', { style: { fontSize: '14px' } }, '\uD83D\uDCD8'),
    props.wide === false ? null : h('span', null, label))
}

/** Settings page body (rendered inline, no overlay chrome). */
function SettingsSection(props) {
  return h(AppBody, { mode: 'inline' })
}

/* ------------------------------------------------------------------ *
 * Plugin entry
 * ------------------------------------------------------------------ */

/**
 * Mount the plugin.
 * @param {object} ctx - client root context.
 */
function apply(ctx) {
  var slots = ctx.get('slots')
  var locale = ctx.get('locale')

  if (locale !== undefined && locale !== null && typeof locale.register === 'function') {
    ctx.effect(function registerDicts() {
      try {
        return locale.register(NS, MESSAGES)
      } catch (error) {
        return function noop() {}
      }
    }, 'english-learn: dictionaries')
  }

  var disposeStyles = injectStyles(CSS)
  ctx.effect(function () { return disposeStyles }, 'english-learn: styles')

  if (slots === undefined || slots === null || typeof slots.inject !== 'function') return

  // The full-screen surface, opened from the sidebar foot.
  try {
    slots.inject('shell.overlay', function () {
      return slots.register({ name: 'shell.overlay', id: 'english-learn.panel', order: 20, locale: NS }, OverlayPanel)
    })
  } catch (error) {
    console.error('[english-learn] overlay seat failed', error)
  }

  try {
    slots.inject('sidebar.footer.action', function () {
      return slots.register({
        name: 'sidebar.footer.action',
        id: 'english-learn.toggle',
        order: 20,
        label: function () { return tr('app.title') },
        locale: NS,
      }, SidebarToggle)
    })
  } catch (error) {
    console.error('[english-learn] sidebar seat failed', error)
  }

  // The same surfaces as a first-level Settings page.
  try {
    slots.inject('settings.section', function () {
      return slots.register({
        name: 'settings.section',
        id: 'english-learn',
        order: 160,
        label: function () { return tr('app.title') },
        locale: NS,
      }, SettingsSection)
    })
  } catch (error) {
    console.error('[english-learn] settings seat failed', error)
  }
}

exports.apply = apply
exports.inject = ['slots', 'locale']
return module.exports
