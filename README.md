# ConfiDict

ConfiDict is a local-first vocabulary confidence trainer. Learners import the
words they want to remember, define five words in their own language each day,
and receive semantic grading from an open-weight model that runs in the browser.

This project is being built for the
[Hacktoberfest Open-Source AI Challenge: Week 2 — Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).

## The problem

Traditional flashcards usually ask learners to reveal an answer and grade
themselves. That makes progress subjective and gives learners little help when
their answer is close but incomplete.

ConfiDict uses open-source AI to compare the learner's free-text definition with
the reference meaning. It then adjusts a transparent confidence score and
prioritizes the words that need the most attention.

## MVP scope

The first version deliberately supports one learning task:

> See a word and explain its definition in your own words.

The MVP includes:

- Individual and bulk word import
- A confidence score from 0 to 100 for every word
- Five daily cards selected from the 15 lowest-confidence words
- Weighted selection so weaker words appear more often without producing the
  exact same session every day
- Local semantic grading with Gemma 4B through Ollama
- Explicit correct, partial, and incorrect feedback
- Learner overrides when the model grades an unusual but valid answer unfairly
- Local progress and review history

ConfiDict does **not** show or store a next-review date for each word.

## Why open-source AI matters

The semantic model is open-weight and runs through
[Ollama](https://ollama.com) on the learner's computer. Definitions can be
graded without sending a learner's word collection or answers to a proprietary
AI provider.

That makes the core experience:

- Private by default
- Free from per-answer API charges
- Inspectable and replaceable
- Suitable for self-hosting
- Available to developers who want to adapt the grading rules

## Storage decision: IndexedDB

The MVP uses **IndexedDB**, a non-SQL database built into modern browsers.

It is the best fit for this version because:

- There are no user accounts or backend database credentials to manage.
- Words and learning history stay on the learner's device.
- The app can continue working when the network is unavailable after required
  assets have been cached.
- A vocabulary deck is naturally represented as small local objects.
- Hosting remains inexpensive because the frontend can be served statically.

Stored records include:

- Words and definitions
- Confidence scores
- Attempts and outcomes
- Daily session membership
- Review history

## Confidence model

New words start at a confidence of 25.

| Result | Confidence change |
| --- | ---: |
| Strong answer | +12 |
| Correct answer | +8 |
| Partially correct | -5 |
| Incorrect answer | -15 |

Scores are always clamped between 0 and 100. The application generates each
daily session from the current scores instead of maintaining a review date for
every card.

## Planned extensions

These ideas are intentionally documented rather than implemented in the MVP.

### FSRS scheduling

The Free Spaced Repetition Scheduler remains a planned advanced review mode.
FSRS could later model difficulty, stability, and retrievability for learners
who want scientifically optimized long-term intervals. It will not replace the
simple confidence mode; users should be able to choose the level of complexity
they want.

### Additional exercise types

- Use the word in a sentence
- Fill in the blank
- Choose between commonly confused words
- Correct an incorrectly used word
- Reverse recall from definition to word
- Pronunciation and spoken-answer practice

### Learner-pattern analysis

A future open-weight language model could analyze review history to identify
patterns such as:

- Strong recognition but weak recall
- Confusion between related words
- Difficulty with abstract adjectives
- Repeatedly incomplete explanations

Those patterns could change the mix of exercises without allowing the model to
invent review schedules or modify scores invisibly.

### Accounts and cross-device sync

If ConfiDict adds accounts, shared decks, tutor dashboards, or multi-device
sync, the local schema can be mirrored to PostgreSQL. PostgreSQL is preferred
for that stage because users, decks, words, reviews, and memberships are
naturally relational.

### Tutor and organization features

- Assigned vocabulary lists
- Progress reports
- Shared class decks
- Configurable grading rubrics
- Private model hosting for schools and businesses

## Technology

- React 19
- TypeScript
- Vite
- Dexie and IndexedDB
- Ollama
- Gemma 3 4B (`gemma3:4b`)
- Zod-validated structured outputs
- Vitest

## Development

```bash
pnpm install
ollama serve
ollama pull gemma3:4b
pnpm dev
```

By default, the frontend calls `http://127.0.0.1:11434` and uses
`gemma3:4b`. Both can be changed at build time:

```bash
VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434
VITE_OLLAMA_MODEL=gemma3:4b
```

Ollama permits localhost web origins by default. If the frontend is hosted on a
different origin, add that exact origin to `OLLAMA_ORIGINS` before starting
Ollama.

Run validation:

```bash
pnpm test
pnpm lint
pnpm build
```

## License

ConfiDict is available under the MIT License.
