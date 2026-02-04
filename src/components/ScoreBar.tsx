'use client';

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
}

export default function ScoreBar({ label, score, maxScore = 100 }: ScoreBarProps) {
  const percentage = Math.min(100, (score / maxScore) * 100);

  const getColor = (pct: number): string => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-green-500';
    if (pct >= 40) return 'bg-yellow-500';
    if (pct >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(percentage)} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-300 w-8 text-right">{score}</span>
    </div>
  );
}
