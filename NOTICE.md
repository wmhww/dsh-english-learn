# Data sources and attribution

`dsh-english-learn` ships no hand-written vocabulary. Every word, pronunciation,
Chinese gloss, collocation and example sentence in `src/data/` is derived from
the open datasets below by `scripts/pipeline.mjs`. This file records what each
source contributes and the licence it is used under.

## Sources

### CET-4 / CET-6 syllabus word lists — the deck itself

- Repository: <https://github.com/mahavivo/english-wordlists>
- Files: `CET4_edited.txt` (4,531 entries), `CET6_edited.txt` (2,219 entries)
- Licence: published word lists, redistributed as a public vocabulary reference
- Used for: **which words are in the deck**, plus a bracketed pronunciation and
  the exam sense for each. This is the spine: the deck is the exam syllabus, not
  a derivation from another dictionary's tags.

### ECDICT — gloss fallback, frequency, collocations

- Repository: <https://github.com/skywind3000/ECDICT>
- Retrieved from: `https://registry.npmjs.org/ecdict/-/ecdict-0.0.4.tgz` (the npm
  distribution of the same dataset, used because `raw.githubusercontent.com` is
  unreachable from the build environment)
- Licence: **MIT**
- Used for: a short Chinese sense when the syllabus list has none, the BNC/COCA
  frequency rank that orders the deck, the collocations (multi-word entries that
  are anchored on the headword and attested in real English), and the `exchange`
  column that supplies inflected forms for example-sentence matching.

### ipa-dict — British English IPA

- Repository: <https://github.com/open-dict-data/ipa-dict>
- File: `data/en_UK.txt`
- Licence: **MIT**
- Used for: the `/ˈaɪ.piː.eɪ/` transcription shown on every card. Preferred over
  ECDICT's own `phonetic` column because it is genuine IPA, whereas ECDICT mixes
  IPA with an ASCII respelling scheme.

### Tatoeba — example sentences

- Project: <https://tatoeba.org>
- Files:
  - `https://downloads.tatoeba.org/exports/per_language/cmn/cmn-eng_links.tsv.bz2`
  - `https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2`
  - `https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2`
  - `https://www.manythings.org/anki/cmn-eng.zip` (conversational fallback)
- Licence: **CC-BY 2.0 (France)** — attribution required
- Used for: the English example sentence and its human Chinese translation, and
  (English side) as the corpus that proves a collocation is real English.

Each Tatoeba sentence carries its own contributor credit in the export, in the
form `CC-BY 2.0 (France) Attribution: tatoeba.org #<id> (<user>)`. The pipeline
selects individual sentences; per-sentence credits are not reproduced on the
cards because the deck shows one sentence at a time without room for a credit
line, but they remain in the upstream exports listed above.

### OpenCC — traditional to simplified Chinese

- Repository: <https://github.com/BYVoid/OpenCC> (JavaScript port: `opencc-js`)
- Licence: **Apache-2.0**
- Used for: the Tatoeba Chinese half mixes Traditional and Simplified script;
  every sentence is normalised to Simplified so the deck is consistent.

### OPUS Tatoeba — optional offline attestation corpus

- Project: <https://opus.nlpl.eu/Tatoeba>
- File: `https://object.pouta.csc.fi/OPUS-Tatoeba/v2023-04-12/mono/en.txt.gz`
- Licence: **CC-BY 2.0**
- Used for: an alternative source of English n-grams for collocation
  attestation when the full Tatoeba English export is not present locally.

## What the pipeline derives

For each headword the pipeline decides, from data alone:

| Field | Rule |
| --- | --- |
| which deck | the syllabus list the word appears on (CET-4 first; CET-6 carries what CET-4 does not) |
| order within a deck | ECDICT BNC/COCA frequency rank, most useful first |
| `ipa` | ipa-dict `en_UK`, then the syllabus list's own bracketed pronunciation, then ECDICT's `phonetic` normalised into IPA |
| `pos`, `cn` | the syllabus list's exam sense, falling back to a short sense from ECDICT |
| `phrases` | ECDICT multi-word entries anchored on the headword, attested in real English, and matching the sense taught — **best effort** |
| `examples` | Tatoeba zh/en pairs filtered by length, script, proper nouns and content — **best effort** |

A word is emitted when it has a pronunciation and a Chinese gloss and is not a
closed-class function word or a high-frequency basic. Collocations and examples
are enrichment: a card without them is still shipped, and the UI hides the empty
sections. This is the deliberate trade — a complete exam word list matters more
than every card being fully illustrated.

Two deduplications protect card slots: a sentence and its contraction-expanded
twin (`We are traveling…` / `We're traveling…`) count as one, and collocations
differing only by a determiner (`our species` / `the species`) count as one.

Content filtering drops sentences about sexual or scatological topics and any
containing slurs. Ordinary words that a CET candidate needs — `drunk`, `die`,
`hell` — are **not** filtered; only unsuitable sentences are.

## Regenerating

```bash
node scripts/import-data.mjs                            # verify/prepare .data-cache
node --max-old-space-size=6144 scripts/pipeline.mjs     # rebuild src/data/
node scripts/audit.mjs                                  # content audit
node scripts/build.mjs                                  # rebuild lib/
node scripts/verify.mjs                                 # run the test suite
```

See [DATA.md](DATA.md) for the download list.
