---
title: "ConfiDict: A Private AI Vocabulary Coach That Focuses on the Words You Don’t Know"
published: false
tags: devchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

I built **ConfiDict**, a local-first vocabulary trainer that helps learners
concentrate on the words they understand least.

Most flashcard applications show an answer and ask the learner to decide whether
they were correct. That self-assessment is subjective: an answer may be
partially correct, use a valid synonym, or miss one important part of the
meaning.

ConfiDict changes that workflow. The learner sees a word and explains its
definition in their own words. A local open-weight Gemma model evaluates the
response, identifies whether it is strong, correct, partial, or incorrect, and
gives concise feedback.

Every word has a visible confidence score between 0 and 100. Each day,
ConfiDict creates a five-card session from the learner's 15 lowest-confidence
words. Weaker words have a greater chance of appearing, but weighted selection
prevents every session from repeating the exact same cards.

The intended users include:

- IELTS, TOEFL, GRE, and other exam candidates
- Adults improving their workplace vocabulary
- Students learning subject-specific terminology
- Tutors who want learners to practise a curated word list

A learner is not paying for another digital deck of cards. They are paying for
focused practice, objective feedback, and less time wasted reviewing words they
already know.

## Demo

**Live demo or video:** _Add after the final build is deployed or recorded._

The core demonstration will show:

1. Importing a list of words and definitions
2. Starting a five-word daily session
3. Defining a word using natural language
4. Receiving private, local Gemma feedback
5. Updating the word's confidence score
6. Seeing weaker words rise to the top of the practice queue

## Code

The project is open source under the MIT License:

{% github MasterFloppa/ConfiDict %}

Repository:
[github.com/MasterFloppa/ConfiDict](https://github.com/MasterFloppa/ConfiDict)

## How I Built It

ConfiDict uses a deliberately small architecture:

- **React 19 and TypeScript** for the responsive web interface
- **Vite** for development and production builds
- **IndexedDB through Dexie** for local persistence
- **Ollama with Gemma 3 4B** for private semantic answer grading
- **Zod** for validating every structured model response
- **Vitest** for confidence-selection and import tests

### Local-first storage

The MVP uses IndexedDB rather than a hosted SQL or document database.

The learner's word list, definitions, confidence scores, daily sessions, and
review history remain in their own browser. There are no accounts, database
credentials, or backend storage costs.

The application stores only the information needed for learning:

- Word
- Reference definition
- Confidence score
- Number of attempts
- Previous result
- Local review history

If ConfiDict later adds accounts and cross-device synchronization, the local
data model can be mirrored to PostgreSQL. For this first version, a hosted
database would add cost and complexity without improving the core experience.

### Selecting the daily five

New words begin with a confidence score of 25.

For each daily session, ConfiDict:

1. Sorts the library from lowest to highest confidence
2. Creates a pool from the 15 weakest words
3. Selects five cards using weighted randomness
4. Gives lower-confidence cards a greater probability of selection

The confidence changes are intentionally transparent:

| Result | Confidence change |
| --- | ---: |
| Strong answer | +12 |
| Correct answer | +8 |
| Partially correct | -5 |
| Incorrect answer | -15 |

Gemma does not secretly choose review dates or directly manipulate scores. It
returns a structured assessment, while deterministic application code applies
the published confidence rules. The learner can also override an unfair AI
assessment.

### Local Gemma grading

The grading prompt sends Gemma:

- The word
- Its reference definition
- The learner's answer
- A strict grading rubric

Gemma returns schema-constrained JSON containing the grade and a short
explanation of what the learner captured or missed. ConfiDict validates the
response before it can affect local learning data.

Running Gemma through Ollama keeps the inference pipeline under the learner's
control. No proprietary AI API receives the vocabulary list or answers, and
there is no per-card inference bill.

## Why Does Open Innovation Matter?

Open innovation is what makes ConfiDict's side-hustle model practical.

A vocabulary product may grade thousands of short answers. With a closed API,
every practice session creates a recurring inference cost. Those costs either
reduce the product's margin or force the learner into a more expensive
subscription.

An open-weight model changes the economics:

- **Private:** Personal vocabulary and answers can remain on the learner's
  computer.
- **Affordable:** Local inference removes per-answer API charges.
- **Replaceable:** The model can be upgraded or exchanged without redesigning
  the learning system.
- **Customizable:** Tutors and schools can change the rubric for a language,
  exam, or subject.
- **Self-hostable:** Organizations can operate the complete grading pipeline
  themselves.

Open source also makes the product easier to trust. The confidence formula,
selection algorithm, prompt, and storage model can all be inspected instead of
being hidden behind a proprietary recommendation system.

## My Agent Session

_A DevRelay agent-session link or embed will be added after the implementation
session is saved._

## Prize Categories

- **Best Use of Gemma**
- **Best Use of GitHub Copilot**

## What Comes Next

The MVP intentionally supports definition recall only. The repository documents
several extensions that can be added without bloating the first release:

- FSRS as an optional advanced scheduling mode
- Sentence-writing exercises
- Fill-in-the-blank questions
- Commonly confused word comparisons
- Reverse recall from definition to word
- Learner-pattern analysis
- Tutor dashboards
- PostgreSQL-backed accounts and synchronization

The most important next step is not adding every feature. It is putting
ConfiDict in front of a real learner, watching one complete session, and
learning whether the feedback makes vocabulary practice meaningfully better.
