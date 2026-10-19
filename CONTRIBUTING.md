# Contributing

## Setup

No dependencies to install — the plugin has none at runtime, and the data
scripts only use the Node standard library.

```bash
node --version          # needs ^22.19.0 || >=24.0.0
npm run build           # generate lib/ from src/
npm run verify          # run the full test suite
```

## The two halves

`src/` is the source of truth; `lib/` is generated and git-ignored.

| Path | What it is |
| --- | --- |
| `src/core.mjs` | Framework-free logic: SM-2 scheduling, spelling comparison, quiz generation, statistics |
| `src/ui.js` | The browser half: React UI and state, mounted into dsh slots |
| `src/index.mjs` | The Host half. Intentionally empty — it exists so the profile row is a valid plugin |
| `src/data/*.json` | Generated decks. **Do not edit by hand** — run `npm run data` |

`scripts/build.mjs` does not bundle: it strips `export` from `core.mjs`, inlines
it with `ui.js` into one module-factory scope, and injects the deck JSON as a
literal. That is why the plugin has no runtime dependencies and works offline.

## Changing the vocabulary

The decks are generated from open data; see [NOTICE.md](NOTICE.md) and
[DATA.md](DATA.md).

```bash
npm run data:import     # verify/prepare the download cache (optional)
npm run data            # regenerate src/data/
npm run audit           # content audit
npm run build
npm run verify
```

`npm run data` needs a raised heap (`--max-old-space-size=6144`) because ECDICT
is 770k rows; the npm script already passes it.

Rules that the pipeline enforces, and why:

- **A card must have IPA and a Chinese gloss.** Everything else is optional.
- **Collocations and examples are best-effort.** Requiring both on every card
  caps the library at a few dozen words — that mistake is in the git history.
- **No function words, no high-frequency basics.** `be`, `of`, `and` carry CET
  tags because a syllabus enumerates them, but they are not vocabulary.
- **Collocations must be attested in real English and match the sense taught.**
  Without that, `drush`-style dictionary artefacts like `hard rush` (灯心草) and
  wrong-sense pairings like `drill` / `drill in` get through.

## Tests

`npm run verify` runs three layers and should stay green:

1. **data** — every deck parses, every word has the required fields, no headword
   repeats across decks.
2. **core** — the scheduler, spelling checker and quiz builder behave, including
   the edge cases (interval cap, empty input, deterministic shuffles).
3. **bundle** — `lib/client.js` is actually executed against a DOM/React shim and
   a fake Cordis context: `apply()` is called, every slot registers, then the
   test clicks through the real UI and asserts progress reaches storage.

The third layer is the one that catches real breakage. It found a click-through
overlay bug, a duplicated-example bug and a hook-state bug that a schema check
would miss. When adding UI behaviour, add an assertion there rather than relying
on a manual click-through.

## Style

Plain JavaScript with no build step for the source itself, so:

- no TypeScript, no JSX — `react.createElement` via the `h` alias
- CommonJS-style `require` is unavailable; the bundle is a single factory scope
- comments explain *why*, especially where a decision looks odd (several do, and
  each one records a bug that was already hit once)
