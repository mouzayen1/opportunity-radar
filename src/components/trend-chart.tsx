'use client'

import { TrendDataPoint } from '@/types/database'

interface TrendChartProps {
  data: TrendDataPoint[]
  height?: number
}

export function TrendChart({ data, height = 120 }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-zinc-800/50 text-zinc-500"
        style={{ height }}
      >
        No trend data available
      </div>
    )
  }

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const width = 100
  const padding = 10

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const linePath = `M ${points.join(' L ')}`

  // Create area path (fill under the line)
  const areaPath = `${linePath} L ${padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2)},${height - padding} L ${padding},${height - padding} Z`

  const isPositive = data[data.length - 1].value > data[0].value
  const strokeColor = isPositive ? '#10b981' : '#ef4444'
  const fillColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'

  return (
    <div className="relative w-full rounded-lg bg-zinc-800/30 p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <line
            key={pct}
            x1={padding}
            y1={height - padding - (pct / 100) * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - (pct / 100) * (height - padding * 2)}
            stroke="#27272a"
            strokeWidth="0.5"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={fillColor} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - padding * 2)
          const y = height - padding - ((d.value - min) / range) * (height - padding * 2)
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="#18181b"
              stroke={strokeColor}
              strokeWidth="2"
            />
          )
        })}
      </svg>

      {/* Labels */}
      <div className="mt-2 flex justify-between text-xs text-zinc-500">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}
