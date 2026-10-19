import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkOllamaAvailability,
  feedbackForGrade,
  gradeDefinition,
  OLLAMA_MODEL,
} from '@/lib/grader'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('feedbackForGrade', () => {
  it('provides fallback feedback for every grade', () => {
    expect(feedbackForGrade('strong')).toContain('Excellent')
    expect(feedbackForGrade('correct')).toContain('Correct')
    expect(feedbackForGrade('partial')).toContain('Close')
    expect(feedbackForGrade('incorrect')).toContain('Not quite')
  })
})

describe('checkOllamaAvailability', () => {
  it('recognizes the configured model', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            models: [{ name: OLLAMA_MODEL }],
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(checkOllamaAvailability()).resolves.toEqual({
      available: true,
      modelInstalled: true,
    })
  })
})

describe('gradeDefinition', () => {
  it('requests structured grading and validates the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: JSON.stringify({
              grade: 'correct',
              feedback: 'The core meaning is accurate.',
            }),
          },
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      gradeDefinition(
        'candid',
        'honest and direct',
        'truthful and straightforward',
      ),
    ).resolves.toEqual({
      grade: 'correct',
      feedback: 'The core meaning is accurate.',
      modelId: OLLAMA_MODEL,
    })

    const request = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    )
    expect(request).toMatchObject({
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: 0, seed: 42 },
    })
    expect(request.format.required).toEqual(['grade', 'feedback'])
    expect(JSON.parse(request.messages[1].content)).toEqual({
      word: 'candid',
      referenceDefinition: 'truthful and straightforward',
      learnerAnswer: 'honest and direct',
    })
  })

  it('surfaces an unreachable Ollama server explicitly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))

    await expect(
      gradeDefinition('candid', 'honest', 'truthful and straightforward'),
    ).rejects.toThrow('Cannot reach Ollama')
  })

  it('rejects malformed model JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: { content: 'not-json' },
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(
      gradeDefinition('candid', 'honest', 'truthful and straightforward'),
    ).rejects.toThrow('malformed JSON')
  })

  it('rejects structured output with an unknown grade', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: {
              content: JSON.stringify({
                grade: 'maybe',
                feedback: 'Uncertain.',
              }),
            },
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(
      gradeDefinition('candid', 'honest', 'truthful and straightforward'),
    ).rejects.toThrow('grading schema')
  })
})
