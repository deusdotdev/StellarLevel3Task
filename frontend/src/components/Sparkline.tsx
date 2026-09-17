import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { mockPriceSeries } from '@/components/ui/market-snapshot'

export function Sparkline({
  ticker,
  lastPrice,
  className,
}: {
  ticker: string
  lastPrice?: number
  className?: string
}) {
  const d = useMemo(() => {
    const last = lastPrice && lastPrice > 0 ? lastPrice : 100
    const data = mockPriceSeries(ticker, last)
    const w = 160
    const h = 48
    const min = Math.min(...data) * 0.97
    const max = Math.max(...data) * 1.02
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = 4 + (1 - (v - min) / (max - min || 1)) * (h - 8)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }, [lastPrice, ticker])

  return (
    <svg
      viewBox="0 0 160 48"
      className={cn('h-12 w-full overflow-visible', className)}
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="var(--chart-2, #4dbe95)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
