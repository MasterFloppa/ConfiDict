import { type FormEvent, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { commitReview } from '@/data/db'
import { gradeDefinition } from '@/lib/grader'
import type {
  Grade,
  GradingResult,
  ModelProgress,
  StoredWordCard,
  StudySession,
} from '@/types'

const GRADE_OPTIONS: Array<{ grade: Grade; label: string }> = [
  { grade: 'strong', label: 'Strong' },
  { grade: 'correct', label: 'Correct' },
  { grade: 'partial', label: 'Partial' },
  { grade: 'incorrect', label: 'Incorrect' },
]

export function StudyExperience({
  session,
  words,
  onExit,
}: {
  session: StudySession
  words: StoredWordCard[]
  onExit: () => void
}) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<GradingResult | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null)
  const [modelProgress, setModelProgress] = useState<ModelProgress | null>(null)
  const [grading, setGrading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pendingWordId = session.wordIds.find(
    (wordId) => !session.completedWordIds.includes(wordId),
  )
  const currentWord = useMemo(
    () => words.find((word) => word.id === pendingWordId),
    [pendingWordId, words],
  )
  const completed = session.completedWordIds.length
  const total = session.wordIds.length

  async function handleGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!currentWord || !answer.trim()) {
      setError('Write your definition before submitting.')
      return
    }

    setGrading(true)
    setError(null)
    setModelProgress({ status: 'starting' })
    try {
      const graded = await gradeDefinition(
        currentWord.term,
        answer,
        currentWord.definition,
        setModelProgress,
      )
      setResult(graded)
      setSelectedGrade(graded.grade)
    } catch (gradingError) {
      setError(
        gradingError instanceof Error
          ? `The local model could not grade this answer: ${gradingError.message}`
          : 'The local model could not grade this answer.',
      )
    } finally {
      setGrading(false)
    }
  }

  async function handleContinue() {
    if (!currentWord || !selectedGrade) {
      return
    }

    setCommitting(true)
    setError(null)
    try {
      await commitReview({
        word: currentWord,
        answer,
        grade: selectedGrade,
        source:
          result && selectedGrade === result.grade ? 'ai' : 'override',
        sessionDate: session.date,
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `Could not save this review: ${saveError.message}`
          : 'Could not save this review. Please try again.',
      )
    } finally {
      setCommitting(false)
    }
  }

  if (session.completedAt || !pendingWordId) {
    return (
      <section className="completion-card">
        <span className="completion-icon">
          <CheckCircle2 size={34} />
        </span>
        <span className="section-kicker">Daily loop complete</span>
        <h1>Today’s review is complete.</h1>
        <p>
          You reviewed {total} {total === 1 ? 'word' : 'words'}. Your confidence
          scores are updated, and tomorrow’s set will be selected fresh from the
          words that need the most attention.
        </p>
        <button className="button primary large" type="button" onClick={onExit}>
          View dashboard
          <ArrowRight size={19} />
        </button>
      </section>
    )
  }

  if (!currentWord) {
    return (
      <section className="loading-panel">
        <LoaderCircle className="spin" size={22} />
        Loading the next word…
      </section>
    )
  }

  const displayProgress = modelProgress?.progress
    ? Math.round(modelProgress.progress)
    : null

  return (
    <section className="study-page">
      <div className="study-topbar">
        <button className="text-button" type="button" onClick={onExit}>
          <ArrowLeft size={17} />
          Leave session
        </button>
        <div className="session-progress-copy">
          <span>
            Word {Math.min(completed + 1, total)} of {total}
          </span>
          <div className="session-progress" aria-hidden="true">
            <span style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="study-card">
        <div className="study-prompt">
          <div className="study-badge">
            <Sparkles size={15} />
            Define this word
          </div>
          <h1>{currentWord.term}</h1>
          <p>Explain the meaning naturally. Exact wording is not required.</p>
        </div>

        <form className="answer-form" onSubmit={handleGrade}>
          <label htmlFor="definition-answer">Your definition</label>
          <textarea
            id="definition-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write what this word means in your own words…"
            rows={6}
            disabled={Boolean(result) || grading}
            autoFocus
          />

          {!result ? (
            <button
              className="button primary large full-width"
              type="submit"
              disabled={grading || answer.trim().length === 0}
            >
              {grading ? (
                <>
                  <LoaderCircle className="spin" size={19} />
                  Grading locally
                  {displayProgress !== null ? ` · ${displayProgress}%` : '…'}
                </>
              ) : (
                <>
                  <BrainCircuit size={19} />
                  Check my definition
                </>
              )}
            </button>
          ) : null}
        </form>

        {grading ? (
          <div className="model-loading" role="status">
            <div>
              <strong>Using your local Gemma model</strong>
              <span>
                ConfiDict sends this word and answer to Ollama on your laptop.
                Nothing is sent to a hosted AI provider.
              </span>
            </div>
            <span>{modelProgress?.status}</span>
          </div>
        ) : null}

        {error ? (
          <div className="grading-error" role="alert">
            <CircleAlert size={20} />
            <div>
              <strong>
                {result
                  ? 'Could not save the review'
                  : 'Automatic grading unavailable'}
              </strong>
              <p>{error}</p>
              <p>
                {result
                  ? 'Your answer is still here. Retry when ready.'
                  : 'Review the reference and choose a grade manually below.'}
              </p>
            </div>
          </div>
        ) : null}

        {result || error ? (
          <div className="result-panel">
            {result ? (
              <div className={`result-heading grade-${result.grade}`}>
                <span>{result.grade}</span>
                <strong>{result.feedback}</strong>
              </div>
            ) : null}

            <div className="answer-comparison">
              <div>
                <span>Your answer</span>
                <p>{answer}</p>
              </div>
              <div>
                <span>Reference definition</span>
                <p>{currentWord.definition}</p>
              </div>
            </div>

            <fieldset className="override-fieldset">
              <legend>
                {result
                  ? 'Adjust the grade if the model misunderstood you'
                  : 'Grade your answer manually'}
              </legend>
              <div className="grade-options">
                {GRADE_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.grade}
                    className={
                      selectedGrade === option.grade
                        ? `grade-option grade-${option.grade} selected`
                        : `grade-option grade-${option.grade}`
                    }
                    onClick={() => setSelectedGrade(option.grade)}
                    aria-pressed={selectedGrade === option.grade}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="result-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  setResult(null)
                  setSelectedGrade(null)
                  setError(null)
                  setModelProgress(null)
                }}
              >
                <RotateCcw size={17} />
                Edit answer
              </button>
              <button
                className="button primary"
                type="button"
                onClick={handleContinue}
                disabled={!selectedGrade || committing}
              >
                {committing ? 'Saving…' : 'Save and continue'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <p className="study-footnote">
        The model provides guidance, not an unquestionable verdict. Your override
        is saved transparently.
      </p>
    </section>
  )
}
