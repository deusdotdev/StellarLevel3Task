import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { CONTRACTS } from '@/lib/config'
import { formatQty, formatUsd, shortAddr, toStroops } from '@/lib/format'
import { getStock, isListed } from '@/lib/stocks'
import { MarketSnapshotCard } from '@/components/ui/market-snapshot'
import { StockLogo } from '@/components/StockLogo'
import {
  PHASE_COPY,
  addrVal,
  i128Val,
  simulateCall,
  symVal,
  useDesk,
} from '@/lib/desk-context'
import { cn } from '@/lib/utils'

function stepQty(current: string, delta: number): string {
  const n = Number.parseFloat(current)
  if (!Number.isFinite(n)) return delta > 0 ? '1' : '0'
  const next = Math.max(0, n + delta)
  return next % 1 === 0 ? String(next) : next.toFixed(4).replace(/\.?0+$/, '')
}

export function StockPage() {
  const { ticker } = useParams()
  const stock = getStock(ticker)
  const {
    address,
    ready,
    phase,
    cash,
    buy,
    sell,
    faucet,
    friendbot,
    onConnect,
  } = useDesk()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [qty, setQty] = useState('1')
  const [ui, setUi] = useState<bigint | null>(null)
  const [price, setPrice] = useState<bigint | null>(null)
  const [quote, setQuote] = useState<bigint | null>(null)
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null)

  const listed = stock ? isListed(stock) : false

  const refresh = useCallback(async () => {
    if (!stock || !listed || !address) return
    try {
      const equityUi = await simulateCall<bigint>(
        address,
        stock.equityId,
        'balance_ui',
        [addrVal(address)],
      )
      setUi(BigInt(equityUi))
      const feed = await simulateCall<{ price: bigint; paused: boolean }>(
        address,
        CONTRACTS.oracle,
        'last_price',
        [symVal(stock.chainSymbol)],
      )
      setPrice(BigInt(feed.price))
      const open = await simulateCall<boolean>(
        address,
        CONTRACTS.desk,
        'window_open',
        [],
      )
      setWindowOpen(open)
      try {
        const amount = toStroops(qty)
        const q = await simulateCall<bigint>(
          address,
          CONTRACTS.desk,
          'quote',
          [symVal(stock.chainSymbol), i128Val(amount)],
        )
        setQuote(BigInt(q))
      } catch {
        setQuote(null)
      }
    } catch {
      setPrice(stock.mockPrice)
    }
  }, [address, listed, qty, stock])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const markValue = useMemo(() => {
    if (ui === null || price === null) return null
    return (ui * price) / 10_000_000n
  }, [price, ui])

  if (!stock) return <Navigate to="/explore" replace />

  const displayPrice = price ?? stock.mockPrice
  const lastDollars = Number(displayPrice) / 10_000_000
  const busy = phase !== 'idle'
  const canTrade = listed && ready && !busy

  return (
    <section className="space-y-6">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-mute transition hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to explore
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-line/80 bg-gradient-to-br from-glass via-black/20 to-glass p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <StockLogo stock={stock} className="h-14 w-14 shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    {stock.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-accent">{stock.ticker}</span>
                    <span className="text-mute">·</span>
                    <span className="text-sm text-mute">{stock.sector}</span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                        listed
                          ? 'bg-accent/15 text-accent'
                          : 'bg-black/40 text-mute',
                      )}
                    >
                      {listed ? 'Listed' : 'Unlisted'}
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-white sm:text-4xl">
                    {formatUsd(displayPrice)}
                  </p>
                  <p className="mt-1 text-xs text-mute">Oracle print · mock · not a real security</p>
                </div>
              </div>

              <dl className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3">
                {[
                  {
                    label: 'Desk window',
                    value: windowOpen === null ? '—' : windowOpen ? 'Open' : 'Closed',
                  },
                  { label: 'Quote asset', value: 'mUSD' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-line/50 bg-black/25 px-3 py-2 text-right sm:min-w-[7.5rem]"
                  >
                    <dt className="text-[10px] uppercase tracking-wide text-mute">{item.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-fog">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <MarketSnapshotCard
            name={stock.name}
            ticker={stock.ticker}
            lastPrice={lastDollars}
            venue="TESTNET · mUSD"
            showHeader={false}
            className="max-w-none border-line/80"
          />

          <p className="px-1 text-xs leading-relaxed text-mute">
            Testnet simulation only. {stock.ticker} tokens are fictional mocks — not shares of{' '}
            {stock.name.replace(' Inc.', '').replace(' Corp.', '')} and not redeemable off-chain.
          </p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-b from-glass to-black/30">
            <div className="border-b border-line/60 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">Trade desk</p>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-line/60 bg-black/35 p-1">
                {(['buy', 'sell'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={cn(
                      'rounded-lg py-2.5 text-sm font-semibold capitalize transition',
                      side === s
                        ? s === 'buy'
                          ? 'bg-accent text-on-accent shadow-sm shadow-accent/20'
                          : 'bg-white/10 text-white'
                        : 'text-mute hover:text-fog',
                    )}
                    onClick={() => setSide(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-medium uppercase tracking-wide text-mute">
                  Shares
                </span>
                <div className="mt-2 flex items-stretch gap-2">
                  <button
                    type="button"
                    aria-label="Decrease shares"
                    className="flex w-11 shrink-0 items-center justify-center rounded-xl border border-line/60 bg-black/30 text-mute transition hover:border-accent/30 hover:text-accent disabled:opacity-40"
                    disabled={busy}
                    onClick={() => setQty((q) => stepQty(q, -1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-line/70 bg-black/40 px-3 py-3 text-center font-mono text-lg text-white outline-none transition focus:border-accent/50"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    inputMode="decimal"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    aria-label="Increase shares"
                    className="flex w-11 shrink-0 items-center justify-center rounded-xl border border-line/60 bg-black/30 text-mute transition hover:border-accent/30 hover:text-accent disabled:opacity-40"
                    disabled={busy}
                    onClick={() => setQty((q) => stepQty(q, 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </label>

              <div className="mt-4 rounded-xl border border-line/50 bg-black/25 px-3 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mute">
                    Est. {side === 'buy' ? 'cost' : 'payout'}
                  </span>
                  <span className="font-mono font-medium text-white">
                    {quote === null ? '—' : formatUsd(quote)}
                  </span>
                </div>
              </div>

              {!address ? (
                <button
                  type="button"
                  className="mt-4 w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-on-accent shadow-lg shadow-accent/15 transition hover:bg-accent-dim"
                  onClick={() => void onConnect()}
                >
                  Connect wallet
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canTrade}
                  className={cn(
                    'mt-4 w-full rounded-xl py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
                    side === 'buy'
                      ? 'bg-accent text-on-accent shadow-lg shadow-accent/15 hover:bg-accent-dim'
                      : 'border border-line/70 bg-white/8 text-white hover:border-accent/30 hover:bg-white/12',
                  )}
                  onClick={() =>
                    void (side === 'buy' ? buy(stock, qty) : sell(stock, qty)).then(() =>
                      refresh(),
                    )
                  }
                >
                  {listed
                    ? `${side === 'buy' ? 'Buy' : 'Sell'} ${stock.ticker}`
                    : 'Not listed on desk'}
                </button>
              )}

              {busy && (
                <p className="mt-3 text-center text-sm text-mute">{PHASE_COPY[phase]}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-line/80 bg-black/25 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">Your balances</p>
            <dl className="mt-4 space-y-3">
              {[
                { label: 'mUSD', value: cash === null ? '—' : formatUsd(cash) },
                { label: stock.ticker, value: ui === null ? '—' : formatQty(ui) },
                { label: 'Mark value', value: markValue === null ? '—' : formatUsd(markValue) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-mute">{row.label}</dt>
                  <dd className="font-mono text-sm text-white">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              disabled={!address || !ready || busy}
              className="w-full rounded-xl border border-accent/35 bg-accent/10 py-3 text-sm font-medium text-accent transition hover:bg-accent/15 disabled:opacity-40"
              onClick={() => void faucet()}
            >
              Get testnet mUSD
            </button>
            <button
              type="button"
              disabled={!address || busy}
              className="w-full rounded-xl border border-line/60 py-3 text-sm text-mute transition hover:border-line hover:text-fog disabled:opacity-40"
              onClick={() => void friendbot()}
            >
              Fund XLM fees
            </button>
          </div>

          <p className="text-center font-mono text-[10px] text-mute">
            Desk {shortAddr(CONTRACTS.desk || '—')}
          </p>
        </aside>
      </div>
    </section>
  )
}
