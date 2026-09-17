import { useMemo, useState } from 'react'
import { STOCKS } from '@/lib/stocks'
import { StockCard } from '@/components/StockCard'

export function ExplorePage() {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return STOCKS
    return STOCKS.filter(
      (s) =>
        s.ticker.toLowerCase().includes(n) ||
        s.name.toLowerCase().includes(n) ||
        s.sector.toLowerCase().includes(n),
    )
  }, [q])

  return (
    <section>
      <div className="mb-6">
        <p className="max-w-2xl text-sm text-mute">
          Ten mock equity tokens we issued on Stellar Testnet. Not Apple, Nvidia, or any
          real security — buy and sell against testnet mUSD at the desk oracle.
        </p>
      </div>
      <label className="mb-4 block">
        <span className="sr-only">Search stocks</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tickers"
          className="w-full rounded-full border border-line bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-mute"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((stock) => (
          <StockCard key={stock.ticker} stock={stock} />
        ))}
      </div>
    </section>
  )
}
