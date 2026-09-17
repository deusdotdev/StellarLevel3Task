import { useMemo } from 'react'
import { cn } from '@/lib/utils'

export function Sparkline({
  ticker,
  className,
}: {
  ticker: string
  className?: string
}) {
  const d = useMemo(() => {
    const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const w = 160
    const h = 48
    const pts: string[] = []
    let y = h * 0.55
    for (let i = 0; i < 24; i++) {
      y += Math.sin(seed / 7 + i * 0.55) * 4.2 + ((seed + i * 3) % 5) - 2
      y = Math.min(h - 4, Math.max(4, y))
      const x = (i / 23) * w
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [ticker])

  return (
    <svg
      viewBox="0 0 160 48"
      className={cn('h-12 w-full overflow-visible', className)}
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
