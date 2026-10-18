import { z } from 'zod'
import type {
  Grade,
  GradingResult,
  ModelProgress,
} from '@/types'

export const OLLAMA_MODEL =
  import.meta.env.VITE_OLLAMA_MODEL?.trim() || 'gemma3:4b'
export const OLLAMA_BASE_URL = (
  import.meta.env.VITE_OLLAMA_BASE_URL?.trim() ||
  'http://127.0.0.1:11434'
).replace(/\/$/, '')

const ModelGradeSchema = z.object({
  grade: z.enum(['strong', 'correct', 'partial', 'incorrect']),
  feedback: z.string().min(3).max(320),
})

const OllamaChatResponseSchema = z.object({
  message: z.object({
    content: z.string(),
  }),
})

const OllamaTagsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string(),
    }),
  ),
})

const GRADE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    grade: {
      type: 'string',
      enum: ['strong', 'correct', 'partial', 'incorrect'],
    },
    feedback: {
      type: 'string',
      description:
        'One concise sentence explaining what the learner captured or missed. Do not merely repeat the grade.',
    },
  },
  required: ['grade', 'feedback'],
  additionalProperties: false,
} as const

export function feedbackForGrade(grade: Grade): string {
  switch (grade) {
    case 'strong':
      return 'Excellent. Your explanation captures the meaning clearly and completely.'
    case 'correct':
      return 'Correct. You captured the essential meaning in your own words.'
    case 'partial':
      return 'Close. Your answer overlaps with the meaning but misses an important detail.'
    case 'incorrect':
      return 'Not quite. Compare your answer with the reference definition before continuing.'
  }
}

export async function checkOllamaAvailability(): Promise<{
  available: boolean
  modelInstalled: boolean
}> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}.`)
  }

  const body = OllamaTagsResponseSchema.parse(await response.json())
  return {
    available: true,
    modelInstalled: body.models.some((model) => model.name === OLLAMA_MODEL),
  }
}

export async function gradeDefinition(
  word: string,
  answer: string,
  expectedDefinition: string,
  onProgress?: (progress: ModelProgress) => void,
): Promise<GradingResult> {
  if (!answer.trim()) {
    throw new Error('Write a definition before asking Gemma to grade it.')
  }

  onProgress?.({ status: 'Connecting to local Ollama' })

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: GRADE_JSON_SCHEMA,
      keep_alive: '10m',
      options: {
        temperature: 0,
        seed: 42,
      },
      messages: [
        {
          role: 'system',
          content: [
            'You are a careful vocabulary tutor grading a learner definition.',
            'Accept accurate paraphrases, synonyms, and concise explanations.',
            'Do not require the learner to repeat the reference wording.',
            'Use strong when the meaning is accurate and complete.',
            'A strong answer must include every essential part of the reference meaning.',
            'A broad one-word synonym can be correct or partial, but never strong.',
            'Use correct when the core meaning is accurate but less complete.',
            'Use partial when the answer is related but misses an essential detail or is too vague.',
            'Use incorrect when the answer is wrong, opposite, unrelated, circular, or does not define the word.',
            'Ignore minor grammar and spelling errors when the intended meaning is clear.',
            'Your feedback must name what the learner captured or what important idea is missing.',
            'Return only JSON matching the supplied schema.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Word: ${word}`,
            `Reference definition: ${expectedDefinition}`,
            `Learner answer: ${answer}`,
          ].join('\n'),
        },
      ],
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(
      `Ollama returned HTTP ${response.status}${
        details ? `: ${details}` : '.'
      }`,
    )
  }

  onProgress?.({ status: `Evaluating with ${OLLAMA_MODEL}` })

  const chatResponse = OllamaChatResponseSchema.parse(await response.json())
  let modelOutput: unknown
  try {
    modelOutput = JSON.parse(chatResponse.message.content)
  } catch {
    throw new Error('Gemma returned malformed JSON.')
  }

  const graded = ModelGradeSchema.parse(modelOutput)
  return {
    grade: graded.grade,
    feedback: graded.feedback,
    modelId: OLLAMA_MODEL,
  }
}
