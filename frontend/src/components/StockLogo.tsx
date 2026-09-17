import { useState } from 'react'
import type { Stock } from '@/lib/stocks'
import { stockLogoSources } from '@/lib/stock-logos'
import { cn } from '@/lib/utils'

export function StockLogo({
  stock,
  className,
}: {
  stock: Stock
  className?: string
}) {
  const sources = stockLogoSources(stock.ticker)
  const [sourceIndex, setSourceIndex] = useState(0)
  const failed = sourceIndex >= sources.length

  if (failed) {
    return (
      <div
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 font-mono text-xs font-semibold text-accent',
          className,
        )}
      >
        {stock.ticker.slice(0, 2)}
      </div>
    )
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={`${stock.name} logo`}
      loading="lazy"
      decoding="async"
      className={cn(
        'h-11 w-11 rounded-2xl border border-line/60 bg-white object-contain p-1.5',
        className,
      )}
      onError={() => setSourceIndex((i) => i + 1)}
    />
  )
}
