import { Brain, CheckCircle2, History, Target } from 'lucide-react'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { confidenceTone } from '@/lib/study'
import type { ReviewEvent, StoredWordCard } from '@/types'

export function ProgressView({
  words,
  reviews,
}: {
  words: StoredWordCard[]
  reviews: ReviewEvent[]
}) {
  const average =
    words.length === 0
      ? 0
      : Math.round(
          words.reduce((sum, word) => sum + word.confidence, 0) / words.length,
        )
  const correct = reviews.filter(
    (review) => review.grade === 'correct' || review.grade === 'strong',
  ).length
  const accuracy =
    reviews.length === 0 ? 0 : Math.round((correct / reviews.length) * 100)
  const bands = [
    {
      label: 'Needs attention',
      tone: 'weak',
      count: words.filter((word) => confidenceTone(word.confidence) === 'weak')
        .length,
    },
    {
      label: 'Building',
      tone: 'building',
      count: words.filter(
        (word) => confidenceTone(word.confidence) === 'building',
      ).length,
    },
    {
      label: 'Growing',
      tone: 'growing',
      count: words.filter(
        (word) => confidenceTone(word.confidence) === 'growing',
      ).length,
    },
    {
      label: 'Strong',
      tone: 'strong',
      count: words.filter(
        (word) => confidenceTone(word.confidence) === 'strong',
      ).length,
    },
  ]

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="section-kicker">Learning signals</span>
          <h1>Your progress</h1>
          <p>
            Confidence is intentionally simple and visible. No hidden next-review
            date is calculated.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <article className="stat-card icon-stat">
          <Target size={20} />
          <span>Average confidence</span>
          <strong>{average}%</strong>
        </article>
        <article className="stat-card icon-stat">
          <History size={20} />
          <span>Total answers</span>
          <strong>{reviews.length}</strong>
        </article>
        <article className="stat-card icon-stat">
          <CheckCircle2 size={20} />
          <span>Correct answers</span>
          <strong>{correct}</strong>
        </article>
        <article className="stat-card icon-stat">
          <Brain size={20} />
          <span>Answer accuracy</span>
          <strong>{accuracy}%</strong>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Confidence distribution</span>
              <h2>Where your words stand</h2>
            </div>
          </div>
          <div className="band-list">
            {bands.map((band) => {
              const percentage =
                words.length === 0 ? 0 : Math.round((band.count / words.length) * 100)
              return (
                <div className="band-row" key={band.label}>
                  <div>
                    <span className={`tone-dot tone-${band.tone}`} />
                    <strong>{band.label}</strong>
                  </div>
                  <div className="band-track" aria-hidden="true">
                    <span
                      className={`tone-${band.tone}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span>{band.count}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Recent activity</span>
              <h2>Latest answers</h2>
            </div>
          </div>
          {reviews.length === 0 ? (
            <div className="empty-list">
              <p>Your review history will appear here.</p>
            </div>
          ) : (
            <div className="review-list">
              {reviews.slice(0, 8).map((review) => (
                <article className="review-row" key={review.id}>
                  <div>
                    <strong>{review.term}</strong>
                    <span>
                      {new Intl.DateTimeFormat(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(new Date(review.reviewedAt))}
                    </span>
                  </div>
                  <span className={`grade-pill grade-${review.grade}`}>
                    {review.grade}
                  </span>
                  <span>
                    {review.confidenceBefore}% → {review.confidenceAfter}%
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {words.length > 0 ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Full library</span>
              <h2>Confidence overview</h2>
            </div>
          </div>
          <div className="progress-word-grid">
            {[...words]
              .sort((left, right) => left.confidence - right.confidence)
              .map((word) => (
                <article key={word.id}>
                  <strong>{word.term}</strong>
                  <ConfidenceMeter confidence={word.confidence} compact />
                </article>
              ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}
