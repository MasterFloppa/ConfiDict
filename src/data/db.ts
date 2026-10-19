import Dexie, { type Table } from 'dexie'
import { SAMPLE_WORDS } from '@/data/sampleWords'
import {
  INITIAL_CONFIDENCE,
  selectDailyWords,
  todayKey,
  updateConfidence,
} from '@/lib/study'
import type {
  Grade,
  ReviewEvent,
  ReviewSource,
  StoredWordCard,
  StudySession,
  WordCard,
  WordEntry,
} from '@/types'

class ConfiDictDatabase extends Dexie {
  words!: Table<WordCard, number>
  reviews!: Table<ReviewEvent, number>
  sessions!: Table<StudySession, string>

  constructor() {
    super('confidict')
    this.version(1).stores({
      words: '++id,&normalizedTerm,confidence,updatedAt',
      reviews: '++id,wordId,reviewedAt,grade',
      sessions: 'date,completedAt',
    })
  }
}

export const db = new ConfiDictDatabase()

function toStoredWord(word: WordCard): StoredWordCard {
  if (word.id === undefined) {
    throw new Error(`Word "${word.term}" was stored without an identifier.`)
  }
  return word as StoredWordCard
}

async function persistWords(
  entries: WordEntry[],
  updateExisting: boolean,
): Promise<{
  added: number
  updated: number
}> {
  let added = 0
  let updated = 0
  const timestamp = new Date().toISOString()

  await db.transaction('rw', db.words, async () => {
    for (const entry of entries) {
      const term = entry.term.trim()
      const definition = entry.definition.trim()
      if (!term || !definition) {
        continue
      }

      const normalizedTerm = term.toLocaleLowerCase()
      const existing = await db.words
        .where('normalizedTerm')
        .equals(normalizedTerm)
        .first()

      if (existing?.id !== undefined && updateExisting) {
        await db.words.update(existing.id, {
          term,
          definition,
          updatedAt: timestamp,
        })
        updated += 1
      } else if (!existing) {
        await db.words.add({
          term,
          normalizedTerm,
          definition,
          confidence: INITIAL_CONFIDENCE,
          attempts: 0,
          correctAnswers: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        added += 1
      }
    }
  })

  return { added, updated }
}

export async function upsertWords(entries: WordEntry[]): Promise<{
  added: number
  updated: number
}> {
  return persistWords(entries, true)
}

export async function loadSampleWords(): Promise<{
  added: number
  updated: number
}> {
  return persistWords(SAMPLE_WORDS, false)
}

export async function deleteWord(wordId: number): Promise<void> {
  await db.transaction('rw', db.words, db.reviews, db.sessions, async () => {
    await db.words.delete(wordId)
    await db.reviews.where('wordId').equals(wordId).delete()

    const sessions = await db.sessions.toArray()
    for (const session of sessions) {
      if (!session.wordIds.includes(wordId)) {
        continue
      }

      const wordIds = session.wordIds.filter((id) => id !== wordId)
      const completedWordIds = session.completedWordIds.filter(
        (id) => id !== wordId,
      )

      if (wordIds.length === 0) {
        await db.sessions.delete(session.date)
        continue
      }

      await db.sessions.update(session.date, {
        wordIds,
        completedWordIds,
        completedAt:
          completedWordIds.length >= wordIds.length
            ? session.completedAt ?? new Date().toISOString()
            : undefined,
      })
    }
  })
}

export async function clearAllLearningData(): Promise<void> {
  await db.transaction(
    'rw',
    db.words,
    db.reviews,
    db.sessions,
    async () => {
      await Promise.all([
        db.words.clear(),
        db.reviews.clear(),
        db.sessions.clear(),
      ])
    },
  )
}

export async function getOrCreateTodaySession(): Promise<StudySession> {
  const date = todayKey()
  return db.transaction('rw', db.words, db.sessions, async () => {
    const existing = await db.sessions.get(date)
    if (existing) {
      return existing
    }

    const words = (await db.words.toArray()).map(toStoredWord)
    if (words.length === 0) {
      throw new Error('Add at least one word before starting a study session.')
    }

    const selected = selectDailyWords(words, date)
    const session: StudySession = {
      date,
      wordIds: selected.map((word) => word.id),
      completedWordIds: [],
      startedAt: new Date().toISOString(),
    }
    await db.sessions.add(session)
    return session
  })
}

export async function commitReview({
  word,
  answer,
  grade,
  source,
  sessionDate,
}: {
  word: StoredWordCard
  answer: string
  grade: Grade
  source: ReviewSource
  sessionDate: string
}): Promise<void> {
  const reviewedAt = new Date().toISOString()
  const confidenceAfter = updateConfidence(word.confidence, grade)

  await db.transaction(
    'rw',
    db.words,
    db.reviews,
    db.sessions,
    async () => {
      const session = await db.sessions.get(sessionDate)
      if (!session) {
        throw new Error('The active study session could not be found.')
      }
      if (!session.wordIds.includes(word.id)) {
        throw new Error('This word is not part of the active study session.')
      }
      if (session.completedWordIds.includes(word.id)) {
        throw new Error('This review has already been saved.')
      }

      await db.words.update(word.id, {
        confidence: confidenceAfter,
        attempts: word.attempts + 1,
        correctAnswers:
          word.correctAnswers + (grade === 'correct' || grade === 'strong' ? 1 : 0),
        lastReviewedAt: reviewedAt,
        lastGrade: grade,
        updatedAt: reviewedAt,
      })

      await db.reviews.add({
        wordId: word.id,
        term: word.term,
        answer,
        expectedDefinition: word.definition,
        grade,
        confidenceBefore: word.confidence,
        confidenceAfter,
        reviewedAt,
        source,
      })

      const completedWordIds = [
        ...new Set([...session.completedWordIds, word.id]),
      ]
      await db.sessions.update(sessionDate, {
        completedWordIds,
        completedAt:
          completedWordIds.length >= session.wordIds.length
            ? reviewedAt
            : undefined,
      })
    },
  )
}
