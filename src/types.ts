export type Grade = 'strong' | 'correct' | 'partial' | 'incorrect'

export type ReviewSource = 'ai' | 'override'

export interface WordEntry {
  term: string
  definition: string
}

export interface WordCard extends WordEntry {
  id?: number
  normalizedTerm: string
  confidence: number
  attempts: number
  correctAnswers: number
  createdAt: string
  updatedAt: string
  lastReviewedAt?: string
  lastGrade?: Grade
}

export interface StoredWordCard extends WordCard {
  id: number
}

export interface ReviewEvent {
  id?: number
  wordId: number
  term: string
  answer: string
  expectedDefinition: string
  grade: Grade
  semanticScore: number
  confidenceBefore: number
  confidenceAfter: number
  reviewedAt: string
  source: ReviewSource
}

export interface StudySession {
  date: string
  wordIds: number[]
  completedWordIds: number[]
  startedAt: string
  completedAt?: string
}

export interface GradingResult {
  grade: Grade
  semanticScore: number
  feedback: string
  modelId: string
}

export interface ModelProgress {
  status: string
  progress?: number
  file?: string
}
