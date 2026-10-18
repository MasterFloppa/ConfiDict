import { describe, expect, it } from 'vitest'
import { feedbackForGrade } from '@/lib/grader'

describe('feedbackForGrade', () => {
  it('provides fallback feedback for every grade', () => {
    expect(feedbackForGrade('strong')).toContain('Excellent')
    expect(feedbackForGrade('correct')).toContain('Correct')
    expect(feedbackForGrade('partial')).toContain('Close')
    expect(feedbackForGrade('incorrect')).toContain('Not quite')
  })
})
