import {
  confidenceLabel,
  confidenceTone,
} from '@/lib/study'

export function ConfidenceMeter({
  confidence,
  compact = false,
}: {
  confidence: number
  compact?: boolean
}) {
  const tone = confidenceTone(confidence)
  const label = confidenceLabel(confidence)

  return (
    <div
      className={compact ? 'confidence compact' : 'confidence'}
      aria-label={`${confidence}% confidence, ${label}`}
    >
      <div className="confidence-track" aria-hidden="true">
        <span
          className={`confidence-fill tone-${tone}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <div className="confidence-caption">
        <span>{label}</span>
        <strong>{confidence}%</strong>
      </div>
    </div>
  )
}
