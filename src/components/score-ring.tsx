interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function ScoreRing({ score, size = 'md', label }: ScoreRingProps) {
  const sizes = {
    sm: { ring: 48, stroke: 4, text: 'text-sm' },
    md: { ring: 80, stroke: 6, text: 'text-xl' },
    lg: { ring: 120, stroke: 8, text: 'text-3xl' },
  }

  const { ring, stroke, text } = sizes[size]
  const radius = (ring - stroke) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  const getColor = () => {
    if (score >= 80) return { stroke: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
    if (score >= 60) return { stroke: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' }
    return { stroke: '#71717a', bg: 'rgba(113, 113, 122, 0.1)' }
  }

  const colors = getColor()

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: ring, height: ring }}>
        <svg className="rotate-[-90deg]" width={ring} height={ring}>
          {/* Background circle */}
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill={colors.bg}
            stroke="#27272a"
            strokeWidth={stroke}
          />
          {/* Progress circle */}
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-white ${text}`}>{score}</span>
        </div>
      </div>
      {label && <span className="text-xs text-zinc-500">{label}</span>}
    </div>
  )
}
