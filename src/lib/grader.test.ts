import { describe, expect, it } from 'vitest'
import { feedbackForGrade, gradeFromScore } from '@/lib/grader'

describe('gradeFromScore', () => {
  it('maps semantic scores to the expected grade bands', () => {
    expect(gradeFromScore(0.9)).toBe('strong')
    expect(gradeFromScore(0.7)).toBe('correct')
    expect(gradeFromScore(0.55)).toBe('partial')
    expect(gradeFromScore(0.2)).toBe('incorrect')
  })

  it('provides feedback for every grade', () => {
    expect(feedbackForGrade('strong')).toContain('Excellent')
    expect(feedbackForGrade('correct')).toContain('Correct')
    expect(feedbackForGrade('partial')).toContain('Close')
    expect(feedbackForGrade('incorrect')).toContain('Not quite')
  })
})
