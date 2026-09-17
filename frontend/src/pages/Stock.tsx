import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CONTRACTS } from '@/lib/config'
import { formatQty, formatUsd, shortAddr, toStroops } from '@/lib/format'
import { getStock, isListed } from '@/lib/stocks'
import { MarketSnapshotCard } from '@/components/ui/market-snapshot'
import {
  PHASE_COPY,
  addrVal,
  i128Val,
  simulateCall,
  symVal,
  useDesk,
} from '@/lib/desk-context'

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
  const [raw, setRaw] = useState<bigint | null>(null)
  const [ui, setUi] = useState<bigint | null>(null)
  const [price, setPrice] = useState<bigint | null>(null)
  const [quote, setQuote] = useState<bigint | null>(null)
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null)

  const listed = stock ? isListed(stock) : false

  const refresh = useCallback(async () => {
    if (!stock || !listed || !address) return
    try {
      const equityRaw = await simulateCall<bigint>(
        address,
        stock.equityId,
        'balance',
        [addrVal(address)],
      )
      setRaw(BigInt(equityRaw))
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

  if (!stock) return <Navigate to="/" replace />

  const displayPrice = price ?? stock.mockPrice

  const lastDollars = Number(displayPrice) / 10_000_000

  return (
    <section className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
      <div className="space-y-4">
        <Link to="/" className="text-xs text-accent underline">
          ← Explore
        </Link>
        <MarketSnapshotCard
          name={stock.name}
          ticker={stock.ticker}
          lastPrice={lastDollars}
          venue="TESTNET · mUSD"
          className="max-w-none"
        />
        <p className="px-1 text-xs text-mute">
          Testnet mock. Not a claim on {stock.name.replace(' Inc.', '').replace(' Corp.', '')}.
        </p>
        <dl className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-glass p-4 text-xs text-mute sm:grid-cols-4">
          <div>
            <dt>Window</dt>
            <dd className="text-fog">
              {windowOpen === null ? '—' : windowOpen ? 'Open' : 'Closed'}
            </dd>
          </div>
          <div>
            <dt>Quote</dt>
            <dd className="text-fog">mUSD</dd>
          </div>
          <div>
            <dt>Desk</dt>
            <dd className="font-mono text-fog">{shortAddr(CONTRACTS.desk || '—')}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className="text-fog">{listed ? 'Listed' : 'Unlisted'}</dd>
          </div>
        </dl>
      </div>

      <aside className="rounded-2xl border border-line bg-glass p-4">
        <div className="flex gap-2">
          {(['buy', 'sell'] as const).map((s) => (
            <button
              key={s}
              className={`flex-1 rounded-lg py-2 text-sm capitalize ${side === s ? 'bg-accent/20 text-white' : 'bg-black/35'}`}
              onClick={() => setSide(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs uppercase tracking-wide text-mute">
          Shares
          <input
            className="mt-1 w-full rounded-lg border border-line bg-black/35 px-3 py-3 font-mono text-lg text-white outline-none"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <p className="mt-2 text-sm text-mute">
          Est. {side === 'buy' ? 'cost' : 'payout'}:{' '}
          {quote === null ? '—' : formatUsd(quote)}
        </p>
        {!address ? (
          <button
            className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-on-accent"
            onClick={() => void onConnect()}
          >
            Connect wallet
          </button>
        ) : (
          <button
            disabled={!listed || !ready || phase !== 'idle'}
            className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-on-accent disabled:opacity-40"
            onClick={() =>
              void (side === 'buy' ? buy(stock, qty) : sell(stock, qty)).then(() =>
                refresh(),
              )
            }
          >
            {listed
              ? `${side === 'buy' ? 'Buy' : 'Sell'} ${stock.ticker} with mUSD`
              : 'Not listed on the desk yet'}
          </button>
        )}
        {phase !== 'idle' && (
          <p className="mt-3 animate-pulse text-sm text-mute">{PHASE_COPY[phase]}</p>
        )}
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-mute">mUSD</dt>
            <dd className="font-mono">{cash === null ? '—' : formatUsd(cash)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mute">{stock.ticker}</dt>
            <dd className="font-mono">{ui === null ? '—' : formatQty(ui)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mute">Raw</dt>
            <dd className="font-mono">{raw === null ? '—' : formatQty(raw)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mute">Mark</dt>
            <dd className="font-mono">
              {markValue === null ? '—' : formatUsd(markValue)}
            </dd>
          </div>
        </dl>
        <button
          disabled={!address || !ready || phase !== 'idle'}
          className="mt-4 w-full rounded-xl border border-accent py-3 text-sm text-accent disabled:opacity-40"
          onClick={() => void faucet()}
        >
          Get testnet mUSD
        </button>
        <button
          disabled={!address || phase !== 'idle'}
          className="mt-2 w-full rounded-xl border border-line py-3 text-sm disabled:opacity-40"
          onClick={() => void friendbot()}
        >
          Fund XLM fees
        </button>
      </aside>
    </section>
  )
}
