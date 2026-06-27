interface Props {
  score: number | undefined
  size?: number
}

function strokeColor(score: number) {
  if (score >= 70) return '#4A7C59'
  if (score >= 40) return '#B07D2A'
  return '#B94040'
}

function textColor(score: number) {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}

export default function MatchScoreRing({ score, size = 40 }: Props) {
  if (score === undefined) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-surface-warm animate-pulse"
      />
    )
  }

  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EDE5D8" strokeWidth="3" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={strokeColor(score)}
          strokeWidth="3"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`font-display font-bold text-xs z-10 ${textColor(score)}`}>{score}</span>
    </div>
  )
}
