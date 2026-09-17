import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { STOCKS } from '@/lib/stocks'
import { StockCard } from '@/components/StockCard'
import { cn } from '@/lib/utils'

const SECTORS = ['All', ...Array.from(new Set(STOCKS.map((s) => s.sector)))]

export function ExplorePage() {
  const [q, setQ] = useState('')
  const [sector, setSector] = useState('All')

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return STOCKS.filter((s) => {
      const matchesSector = sector === 'All' || s.sector === sector
      if (!matchesSector) return false
      if (!n) return true
      return (
        s.ticker.toLowerCase().includes(n) ||
        s.name.toLowerCase().includes(n) ||
        s.sector.toLowerCase().includes(n)
      )
    })
  }, [q, sector])

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-line/80 bg-gradient-to-br from-glass via-black/20 to-glass p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
              Primary desk
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Explore
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute">
              Ten mock equity tokens on Stellar Testnet. Not Apple, Nvidia, or any real
              security — buy and sell against testnet mUSD at the desk oracle.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center sm:gap-4">
            {[
              { label: 'Markets', value: String(STOCKS.length) },
              { label: 'Network', value: 'Testnet' },
              { label: 'Quote', value: 'mUSD' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-line/60 bg-black/30 px-3 py-3 sm:px-4"
              >
                <dt className="text-[10px] uppercase tracking-wide text-mute">{item.label}</dt>
                <dd className="mt-1 font-mono text-sm text-white sm:text-base">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tickers, names, sectors…"
            className="w-full rounded-2xl border border-line bg-black/40 py-3.5 pr-4 pl-11 text-sm text-white outline-none placeholder:text-mute focus:border-accent/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {SECTORS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSector(item)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                sector === item
                  ? 'border-accent/40 bg-accent/15 text-accent'
                  : 'border-line/60 bg-black/25 text-mute hover:border-accent/25 hover:text-fog',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line/70 bg-black/20 px-6 py-12 text-center">
          <p className="text-sm text-mute">No tickers match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((stock) => (
            <StockCard key={stock.ticker} stock={stock} />
          ))}
        </div>
      )}
    </section>
  )
}
