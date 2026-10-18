import type {
  Grade,
  GradingResult,
  ModelProgress,
} from '@/types'

export const SEMANTIC_MODEL_ID = 'onnx-community/all-MiniLM-L6-v2-ONNX'

interface EmbeddingTensor {
  tolist(): number[][]
}

type FeatureExtractor = (
  texts: string[],
  options: { pooling: 'mean'; normalize: true },
) => Promise<EmbeddingTensor>

let extractorPromise: Promise<FeatureExtractor> | null = null

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function meaningfulTokens(value: string): Set<string> {
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'as',
    'be',
    'being',
    'by',
    'for',
    'from',
    'in',
    'is',
    'it',
    'of',
    'or',
    'that',
    'the',
    'to',
    'with',
  ])

  return new Set(
    normalizeText(value)
      .split(' ')
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  )
}

function lexicalCoverage(answer: string, definition: string): number {
  const answerTokens = meaningfulTokens(answer)
  const definitionTokens = meaningfulTokens(definition)
  if (definitionTokens.size === 0) {
    return 0
  }

  let matches = 0
  for (const token of definitionTokens) {
    if (answerTokens.has(token)) {
      matches += 1
    }
  }
  return matches / definitionTokens.size
}

function hasNegation(value: string): boolean {
  return /\b(?:no|not|never|neither|without|lacks?|isn't|aren't|doesn't|don't)\b/i.test(
    value,
  )
}

function dotProduct(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length)
  let total = 0
  for (let index = 0; index < length; index += 1) {
    total += left[index] * right[index]
  }
  return total
}

export function gradeFromScore(score: number): Grade {
  if (score >= 0.78) {
    return 'strong'
  }
  if (score >= 0.64) {
    return 'correct'
  }
  if (score >= 0.47) {
    return 'partial'
  }
  return 'incorrect'
}

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

function readProgress(event: unknown): ModelProgress {
  if (!event || typeof event !== 'object') {
    return { status: 'loading' }
  }

  const record = event as Record<string, unknown>
  return {
    status: typeof record.status === 'string' ? record.status : 'loading',
    progress:
      typeof record.progress === 'number'
        ? Math.max(0, Math.min(100, record.progress))
        : undefined,
    file: typeof record.file === 'string' ? record.file : undefined,
  }
}

async function getExtractor(
  onProgress?: (progress: ModelProgress) => void,
): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers').then(
      async ({ env, pipeline }) => {
        env.allowLocalModels = false
        env.useBrowserCache = true

        const extractor = await pipeline(
          'feature-extraction',
          SEMANTIC_MODEL_ID,
          {
            dtype: 'q8',
            progress_callback: (event: unknown) => {
              onProgress?.(readProgress(event))
            },
          },
        )

        return extractor as FeatureExtractor
      },
    )
  }

  return extractorPromise
}

export async function gradeDefinition(
  answer: string,
  expectedDefinition: string,
  onProgress?: (progress: ModelProgress) => void,
): Promise<GradingResult> {
  const normalizedAnswer = normalizeText(answer)
  const normalizedDefinition = normalizeText(expectedDefinition)

  if (!normalizedAnswer) {
    throw new Error('Write a definition before asking the model to grade it.')
  }

  if (normalizedAnswer === normalizedDefinition) {
    return {
      grade: 'strong',
      semanticScore: 1,
      feedback: feedbackForGrade('strong'),
      modelId: SEMANTIC_MODEL_ID,
    }
  }

  const extractor = await getExtractor(onProgress)
  const embeddings = await extractor(
    [normalizedAnswer, normalizedDefinition],
    { pooling: 'mean', normalize: true },
  )
  const [answerEmbedding, definitionEmbedding] = embeddings.tolist()

  if (!answerEmbedding || !definitionEmbedding) {
    throw new Error('The semantic model returned an incomplete embedding result.')
  }

  const semanticSimilarity = dotProduct(answerEmbedding, definitionEmbedding)
  const tokenCoverage = lexicalCoverage(normalizedAnswer, normalizedDefinition)
  const negationPenalty =
    hasNegation(normalizedAnswer) !== hasNegation(normalizedDefinition) ? 0.12 : 0
  const combinedScore = Math.max(
    0,
    Math.min(
      1,
      semanticSimilarity * 0.88 + tokenCoverage * 0.12 - negationPenalty,
    ),
  )
  const grade = gradeFromScore(combinedScore)

  return {
    grade,
    semanticScore: combinedScore,
    feedback: feedbackForGrade(grade),
    modelId: SEMANTIC_MODEL_ID,
  }
}
