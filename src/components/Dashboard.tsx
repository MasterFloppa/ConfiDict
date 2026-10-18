import {
  ArrowRight,
  Brain,
  Database,
  Play,
  Sparkles,
  Target,
} from 'lucide-react'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { todayKey } from '@/lib/study'
import type {
  ReviewEvent,
  StoredWordCard,
  StudySession,
} from '@/types'

interface DashboardProps {
  words: StoredWordCard[]
  reviews: ReviewEvent[]
  session?: StudySession
  onStart: () => Promise<void>
  onOpenWords: () => void
  onLoadSample: () => Promise<void>
}

export function Dashboard({
  words,
  reviews,
  session,
  onStart,
  onOpenWords,
  onLoadSample,
}: DashboardProps) {
  if (words.length === 0) {
    return (
      <section className="empty-hero">
        <div className="eyebrow">
          <Sparkles size={16} />
          Open-source AI, focused practice
        </div>
        <h1>Build confidence in the words that matter to you.</h1>
        <p>
          Import your vocabulary list, define five words each day, and let a
          local semantic model identify which meanings need more practice.
        </p>
        <div className="hero-actions">
          <button className="button primary" type="button" onClick={onOpenWords}>
            Add your words
            <ArrowRight size={18} />
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={onLoadSample}
          >
            <Database size={18} />
            Try the sample deck
          </button>
        </div>
        <div className="empty-feature-grid">
          <article>
            <Brain size={22} />
            <h2>Semantic grading</h2>
            <p>Answer naturally instead of matching an exact phrase.</p>
          </article>
          <article>
            <Target size={22} />
            <h2>Weak words first</h2>
            <p>Your daily five come from the lowest-confidence pool.</p>
          </article>
          <article>
            <Database size={22} />
            <h2>Stored locally</h2>
            <p>No account or hosted database is required for the MVP.</p>
          </article>
        </div>
      </section>
    )
  }

  const averageConfidence = Math.round(
    words.reduce((sum, word) => sum + word.confidence, 0) / words.length,
  )
  const todayReviews = reviews.filter((review) =>
    todayKey(new Date(review.reviewedAt)) === todayKey(),
  ).length
  const weakest = [...words]
    .sort((left, right) => left.confidence - right.confidence)
    .slice(0, 5)
  const sessionComplete = Boolean(session?.completedAt)
  const completedCount = session?.completedWordIds.length ?? 0

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">
            <Sparkles size={16} />
            Your daily confidence loop
          </div>
          <h1>
            {sessionComplete
              ? 'Daily practice complete.'
              : 'Five words. Focused feedback.'}
          </h1>
          <p>
            ConfiDict samples from your 15 lowest-confidence words and grades
            each definition with an open-weight model running locally through
            Ollama.
          </p>
        </div>
        <div className="dashboard-action">
          <div className="daily-count">
            <strong>{sessionComplete ? 5 : completedCount}</strong>
            <span>of 5 today</span>
          </div>
          <button
            className="button primary large"
            type="button"
            onClick={onStart}
          >
            <Play size={19} fill="currentColor" />
            {sessionComplete
              ? 'View today’s result'
              : completedCount > 0
                ? 'Resume practice'
                : 'Start today’s five'}
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <article className="stat-card">
          <span>Words in your library</span>
          <strong>{words.length}</strong>
          <small>Private to this browser</small>
        </article>
        <article className="stat-card">
          <span>Average confidence</span>
          <strong>{averageConfidence}%</strong>
          <small>Across your full library</small>
        </article>
        <article className="stat-card">
          <span>Answers today</span>
          <strong>{todayReviews}</strong>
          <small>Daily goal: 5</small>
        </article>
        <article className="stat-card">
          <span>Total reviews</span>
          <strong>{reviews.length}</strong>
          <small>Saved locally</small>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Priority queue</span>
              <h2>Your weakest words</h2>
            </div>
            <button className="text-button" type="button" onClick={onOpenWords}>
              View library
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="weak-word-list">
            {weakest.map((word) => (
              <article className="weak-word-row" key={word.id}>
                <div>
                  <strong>{word.term}</strong>
                  <span>{word.definition}</span>
                </div>
                <ConfidenceMeter confidence={word.confidence} compact />
              </article>
            ))}
          </div>
        </section>

        <aside className="panel model-panel">
          <div className="model-icon">
            <Brain size={24} />
          </div>
          <span className="section-kicker">How grading works</span>
          <h2>A model, not a keyword check.</h2>
          <p>
            Gemma reads your answer and the reference meaning through Ollama on
            your laptop. The response follows a strict grading schema, and you
            can always override its decision.
          </p>
          <div className="model-facts">
            <span>Gemma 4B</span>
            <span>Local Ollama</span>
            <span>No per-answer fee</span>
          </div>
        </aside>
      </div>
    </section>
  )
}
