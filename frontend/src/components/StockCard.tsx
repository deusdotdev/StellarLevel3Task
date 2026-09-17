import { Link } from 'react-router-dom'
import { formatUsd } from '@/lib/format'
import { isListed, type Stock } from '@/lib/stocks'
import { Sparkline } from '@/components/Sparkline'
import { cn } from '@/lib/utils'

export function StockCard({ stock, livePrice }: { stock: Stock; livePrice?: bigint | null }) {
  const listed = isListed(stock)
  const price = livePrice ?? stock.mockPrice

  return (
    <Link
      to={`/s/${stock.ticker}`}
      className="group rounded-2xl border border-line bg-glass p-4 transition hover:border-accent/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-semibold text-accent">
            {stock.ticker.slice(0, 2)}
          </div>
          <div>
            <p className="font-mono text-sm text-accent">${stock.ticker}</p>
            <p className="text-sm text-fog">{stock.name}</p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide',
            listed
              ? 'bg-accent/15 text-accent'
              : 'bg-black/40 text-mute',
          )}
        >
          {listed ? 'Live' : 'Unlisted'}
        </span>
      </div>
      <div className="mt-4 text-accent">
        <Sparkline ticker={stock.ticker} />
      </div>
      <div className="mt-3 flex items-end justify-between">
        <p className="font-mono text-lg text-white">{formatUsd(price)}</p>
        <p className="text-xs text-mute">{stock.sector} · mock</p>
      </div>
    </Link>
  )
}
