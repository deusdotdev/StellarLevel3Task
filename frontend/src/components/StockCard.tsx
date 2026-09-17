import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
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
      className="group relative overflow-hidden rounded-2xl border border-line/70 bg-gradient-to-br from-glass via-black/25 to-glass p-4 transition duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 font-mono text-xs font-semibold text-accent">
            {stock.ticker.slice(0, 2)}
          </div>
          <div>
            <p className="font-mono text-sm text-accent">${stock.ticker}</p>
            <p className="text-sm text-fog">{stock.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide',
              listed ? 'bg-accent/15 text-accent' : 'bg-black/40 text-mute',
            )}
          >
            {listed ? 'Live' : 'Unlisted'}
          </span>
          <ArrowUpRight
            className="h-4 w-4 text-mute transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
          />
        </div>
      </div>

      <div className="mt-5 text-accent">
        <Sparkline ticker={stock.ticker} lastPrice={Number(price) / 10_000_000} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xl text-white">{formatUsd(price)}</p>
          <p className="mt-1 text-xs text-mute">Oracle print · mock</p>
        </div>
        <span className="rounded-full border border-line/60 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-wide text-mute">
          {stock.sector}
        </span>
      </div>
    </Link>
  )
}
