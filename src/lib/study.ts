import type { Grade, StoredWordCard } from '@/types'

export const DAILY_CARD_COUNT = 5
export const LOW_CONFIDENCE_POOL_SIZE = 15
export const INITIAL_CONFIDENCE = 25

const GRADE_DELTAS: Record<Grade, number> = {
  strong: 12,
  correct: 8,
  partial: -5,
  incorrect: -15,
}

export function clampConfidence(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function updateConfidence(confidence: number, grade: Grade): number {
  return clampConfidence(confidence + GRADE_DELTAS[grade])
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 80) {
    return 'Strong'
  }
  if (confidence >= 60) {
    return 'Growing'
  }
  if (confidence >= 30) {
    return 'Building'
  }
  return 'Needs attention'
}

export function confidenceTone(
  confidence: number,
): 'strong' | 'growing' | 'building' | 'weak' {
  if (confidence >= 80) {
    return 'strong'
  }
  if (confidence >= 60) {
    return 'growing'
  }
  if (confidence >= 30) {
    return 'building'
  }
  return 'weak'
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state += 0x6d2b79f5
    let result = state
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

export function selectDailyWords(
  words: StoredWordCard[],
  dateKey: string,
  count = DAILY_CARD_COUNT,
  poolSize = LOW_CONFIDENCE_POOL_SIZE,
): StoredWordCard[] {
  if (words.length <= count) {
    return [...words].sort((left, right) => left.confidence - right.confidence)
  }

  const pool = [...words]
    .sort((left, right) => {
      if (left.confidence !== right.confidence) {
        return left.confidence - right.confidence
      }
      if (left.attempts !== right.attempts) {
        return left.attempts - right.attempts
      }
      return left.term.localeCompare(right.term)
    })
    .slice(0, Math.min(poolSize, words.length))

  const seedMaterial = `${dateKey}:${pool
    .map((word) => `${word.id}:${word.confidence}:${word.attempts}`)
    .join('|')}`
  const random = mulberry32(hashString(seedMaterial))
  const available = [...pool]
  const selected: StoredWordCard[] = []

  while (selected.length < Math.min(count, available.length)) {
    const weights = available.map((word) => Math.max(1, 105 - word.confidence))
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = random() * totalWeight
    let selectedIndex = available.length - 1

    for (let index = 0; index < weights.length; index += 1) {
      cursor -= weights[index]
      if (cursor <= 0) {
        selectedIndex = index
        break
      }
    }

    const [word] = available.splice(selectedIndex, 1)
    selected.push(word)
  }

  return selected
}

export function todayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
