import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllLearningData,
  commitReview,
  db,
  deleteWord,
  getOrCreateTodaySession,
  loadSampleWords,
  upsertWords,
} from '@/data/db'

beforeEach(async () => {
  await db.open()
  await clearAllLearningData()
})

afterAll(() => {
  db.close()
})

describe('word persistence', () => {
  it('updates definitions without resetting learning progress', async () => {
    await upsertWords([
      { term: 'Candid', definition: 'truthful and straightforward' },
    ])
    const original = await db.words.where('normalizedTerm').equals('candid').first()
    expect(original?.id).toBeTypeOf('number')

    await db.words.update(original!.id!, {
      confidence: 60,
      attempts: 3,
    })
    const result = await upsertWords([
      { term: 'candid', definition: 'honest, direct, and frank' },
    ])
    const updated = await db.words.where('normalizedTerm').equals('candid').first()

    expect(result).toEqual({ added: 0, updated: 1 })
    expect(updated).toMatchObject({
      term: 'candid',
      definition: 'honest, direct, and frank',
      confidence: 60,
      attempts: 3,
    })
  })

  it('loads only missing sample words and preserves user definitions', async () => {
    await upsertWords([
      { term: 'abate', definition: 'my preferred definition' },
    ])
    const result = await loadSampleWords()
    const abate = await db.words.where('normalizedTerm').equals('abate').first()

    expect(result).toEqual({ added: 19, updated: 0 })
    expect(abate?.definition).toBe('my preferred definition')
    expect(await db.words.count()).toBe(20)
  })
})

describe('study sessions', () => {
  it('uses every available word when the library has fewer than five', async () => {
    await upsertWords([
      { term: 'one', definition: 'first' },
      { term: 'two', definition: 'second' },
      { term: 'three', definition: 'third' },
    ])

    const session = await getOrCreateTodaySession()
    expect(session.wordIds).toHaveLength(3)
  })

  it('creates only one session when start is requested concurrently', async () => {
    await upsertWords([{ term: 'one', definition: 'first' }])

    const [first, second] = await Promise.all([
      getOrCreateTodaySession(),
      getOrCreateTodaySession(),
    ])

    expect(first.date).toBe(second.date)
    expect(first.wordIds).toEqual(second.wordIds)
    expect(await db.sessions.count()).toBe(1)
  })

  it('removes deleted words from active sessions instead of stranding them', async () => {
    await upsertWords([
      { term: 'one', definition: 'first' },
      { term: 'two', definition: 'second' },
    ])
    const words = await db.words.toArray()
    const firstId = words[0].id!
    const secondId = words[1].id!
    const session = await getOrCreateTodaySession()

    await deleteWord(firstId)
    const updatedSession = await db.sessions.get(session.date)
    expect(updatedSession?.wordIds).toEqual([secondId])

    await deleteWord(secondId)
    expect(await db.sessions.get(session.date)).toBeUndefined()
  })

  it('commits a review and completes the session atomically', async () => {
    await upsertWords([{ term: 'candid', definition: 'truthful and direct' }])
    const word = await db.words.where('normalizedTerm').equals('candid').first()
    const session = await getOrCreateTodaySession()

    await commitReview({
      word: { ...word!, id: word!.id! },
      answer: 'honest and direct',
      grade: 'strong',
      source: 'ai',
      sessionDate: session.date,
    })

    expect(await db.words.get(word!.id!)).toMatchObject({
      confidence: 37,
      attempts: 1,
      correctAnswers: 1,
      lastGrade: 'strong',
    })
    expect(await db.reviews.count()).toBe(1)
    expect((await db.sessions.get(session.date))?.completedAt).toBeTruthy()

    await expect(
      commitReview({
        word: { ...word!, id: word!.id! },
        answer: 'honest and direct',
        grade: 'strong',
        source: 'ai',
        sessionDate: session.date,
      }),
    ).rejects.toThrow('already been saved')
    expect(await db.reviews.count()).toBe(1)
  })
})
