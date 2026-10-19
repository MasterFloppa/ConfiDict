import { describe, expect, it } from 'vitest'
import {
  confidenceLabel,
  confidenceTone,
  selectDailyWords,
  updateConfidence,
} from '@/lib/study'
import type { StoredWordCard } from '@/types'

function createWord(
  id: number,
  confidence: number,
  attempts = 0,
): StoredWordCard {
  const timestamp = '2026-10-18T00:00:00.000Z'
  return {
    id,
    term: `word-${id}`,
    normalizedTerm: `word-${id}`,
    definition: `definition-${id}`,
    confidence,
    attempts,
    correctAnswers: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

describe('updateConfidence', () => {
  it('applies grade deltas and clamps the score', () => {
    expect(updateConfidence(25, 'strong')).toBe(37)
    expect(updateConfidence(25, 'correct')).toBe(33)
    expect(updateConfidence(4, 'incorrect')).toBe(0)
    expect(updateConfidence(96, 'strong')).toBe(100)
  })

  it('uses consistent labels and tones at every boundary', () => {
    expect([confidenceLabel(0), confidenceTone(0)]).toEqual([
      'Needs attention',
      'weak',
    ])
    expect([confidenceLabel(30), confidenceTone(30)]).toEqual([
      'Building',
      'building',
    ])
    expect([confidenceLabel(60), confidenceTone(60)]).toEqual([
      'Growing',
      'growing',
    ])
    expect([confidenceLabel(80), confidenceTone(80)]).toEqual([
      'Strong',
      'strong',
    ])
  })
})

describe('selectDailyWords', () => {
  it('selects only from the lowest-confidence pool', () => {
    const words = Array.from({ length: 30 }, (_, index) =>
      createWord(index + 1, index),
    )
    const selected = selectDailyWords(words, '2026-10-18', 5, 15)

    expect(selected).toHaveLength(5)
    expect(selected.every((word) => word.confidence < 15)).toBe(true)
  })

  it('is stable for the same date and word state', () => {
    const words = Array.from({ length: 20 }, (_, index) =>
      createWord(index + 1, 25),
    )
    const first = selectDailyWords(words, '2026-10-18')
    const second = selectDailyWords(words, '2026-10-18')

    expect(first.map((word) => word.id)).toEqual(
      second.map((word) => word.id),
    )
  })

  it('returns every word once when fewer than the daily target exist', () => {
    const words = [createWord(1, 80), createWord(2, 10), createWord(3, 40)]
    const selected = selectDailyWords(words, '2026-10-18')

    expect(selected.map((word) => word.id)).toEqual([2, 3, 1])
    expect(new Set(selected.map((word) => word.id)).size).toBe(3)
  })

  it('never selects duplicate cards', () => {
    const words = Array.from({ length: 20 }, (_, index) =>
      createWord(index + 1, 25),
    )
    const selected = selectDailyWords(words, '2026-10-18')

    expect(new Set(selected.map((word) => word.id)).size).toBe(selected.length)
  })
})
