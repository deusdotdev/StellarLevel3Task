import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ADMIN,
  CONTRACTS,
  MARKETS,
  type MarketSymbol,
  contractsReady,
} from './lib/config'
import { classifyError } from './lib/errors'
import {
  formatQty,
  formatUsd,
  shortAddr,
  toStroops,
} from './lib/format'
import {
  addrVal,
  boolVal,
  fetchEvents,
  i128Val,
  simulateCall,
  submitCall,
  symVal,
  type ChainEvent,
  type TxPhase,
} from './lib/soroban'
import { connectWallet, disconnectWallet, initWallet } from './lib/wallet'

type Tab = 'trade' | 'book' | 'tape' | 'ops'

const PHASE_COPY: Record<TxPhase, string> = {
  idle: '',
  simulating: 'Simulating on RPC…',
  signing: 'Waiting for wallet signature…',
  submitting: 'Broadcasting to Testnet…',
  confirming: 'Waiting for ledger close…',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('trade')
  const [address, setAddress] = useState('')
  const [symbol, setSymbol] = useState<MarketSymbol>('ALPHA')
  const [side, setSide] = useState<'mint' | 'redeem'>('mint')
  const [qty, setQty] = useState('1')
  const [phase, setPhase] = useState<TxPhase>('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hash, setHash] = useState('')
  const [cash, setCash] = useState<bigint | null>(null)
  const [raw, setRaw] = useState<bigint | null>(null)
  const [ui, setUi] = useState<bigint | null>(null)
  const [mult, setMult] = useState<bigint | null>(null)
  const [price, setPrice] = useState<bigint | null>(null)
  const [quote, setQuote] = useState<bigint | null>(null)
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null)
  const [events, setEvents] = useState<ChainEvent[]>([])
  const ready = contractsReady()
  const market = MARKETS.find((m) => m.symbol === symbol)!
  const isAdmin = Boolean(address && ADMIN && address === ADMIN)

  useEffect(() => {
    initWallet()
  }, [])

  const refresh = useCallback(async () => {
    if (!ready || !address) return
    try {
      const cashBal = await simulateCall<bigint>(
        address,
        CONTRACTS.cash,
        'balance',
        [addrVal(address)],
      )
      setCash(BigInt(cashBal))
      const equityRaw = await simulateCall<bigint>(
        address,
        market.equityId,
        'balance',
        [addrVal(address)],
      )
      setRaw(BigInt(equityRaw))
      const equityUi = await simulateCall<bigint>(
        address,
        market.equityId,
        'balance_ui',
        [addrVal(address)],
      )
      setUi(BigInt(equityUi))
      const multiplier = await simulateCall<bigint>(
        address,
        market.equityId,
        'multiplier',
        [],
      )
      setMult(BigInt(multiplier))
      const feed = await simulateCall<{ price: bigint; paused: boolean }>(
        address,
        CONTRACTS.oracle,
        'last_price',
        [symVal(symbol)],
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
        const q = toStroops(qty)
        const qv = await simulateCall<bigint>(
          address,
          CONTRACTS.desk,
          'quote',
          [symVal(symbol), i128Val(q)],
        )
        setQuote(BigInt(qv))
      } catch {
        setQuote(null)
      }
    } catch (e) {
      setError(classifyError(e))
    }
  }, [address, market.equityId, qty, ready, symbol])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!ready) return
    let cancel = false
    const tick = async () => {
      try {
        const list = await fetchEvents([
          CONTRACTS.desk,
          CONTRACTS.oracle,
          CONTRACTS.alpha,
          CONTRACTS.index,
          CONTRACTS.cash,
        ])
        if (!cancel) setEvents(list)
      } catch {
        /* event polling is best-effort */
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), 8000)
    return () => {
      cancel = true
      window.clearInterval(id)
    }
  }, [ready])

  async function run(label: string, fn: () => Promise<string>) {
    setError('')
    setNotice('')
    setHash('')
    try {
      const h = await fn()
      setHash(h)
      setNotice(label)
      await refresh()
    } catch (e) {
      setError(classifyError(e))
    } finally {
      setPhase('idle')
    }
  }

  async function onConnect() {
    setError('')
    try {
      const a = await connectWallet()
      setAddress(a)
    } catch (e) {
      setError(classifyError(e))
    }
  }

  const markValue = useMemo(() => {
    if (ui === null || price === null) return null
    return (ui * price) / 10_000_000n
  }, [price, ui])

  return (
    <div className="min-h-svh bg-[#07110d] text-[#d7e4d4]">
      <div className="border-b border-[#1f3d2c] bg-[#b45309] px-4 py-2 text-center text-[13px] font-medium text-[#fff7ed]">
        Testnet simulation. EQ-ALPHA and EQ-INDEX are fictional instruments — not
        shares, not investment advice, not 1:1 anything in the real world.
      </div>

      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-[#86efac]">EQRAIL</p>
          <h1 className="text-xl font-semibold text-white sm:text-2xl">
            Primary desk
          </h1>
        </div>
        {address ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#245c3a] bg-[#0c1f16] px-3 py-1 font-mono text-xs">
              {shortAddr(address)}
            </span>
            <button
              className="text-xs text-[#86efac] underline"
              onClick={() => {
                void disconnectWallet()
                setAddress('')
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="rounded-full bg-[#4ade80] px-4 py-2 text-sm font-semibold text-[#052e16]"
            onClick={() => void onConnect()}
          >
            Connect wallet
          </button>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 sm:pb-12">
        {!ready && (
          <p className="mb-4 rounded-xl border border-[#245c3a] bg-[#0c1f16] p-4 text-sm">
            Contract IDs are missing. Run <code className="text-[#86efac]">scripts/deploy.sh</code>{' '}
            then copy IDs into <code className="text-[#86efac]">frontend/.env.local</code>.
          </p>
        )}

        <nav className="mb-4 flex gap-1 overflow-x-auto rounded-full border border-[#1f3d2c] bg-[#0c1f16] p-1 text-sm">
          {(
            [
              ['trade', 'Trade'],
              ['book', 'Book'],
              ['tape', 'Tape'],
              ['ops', 'Ops'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={`flex-1 rounded-full px-3 py-2 ${tab === id ? 'bg-[#14532d] text-white' : 'text-[#9ca3af]'}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && (
          <p className="mb-3 rounded-lg border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-3 rounded-lg border border-[#14532d] bg-[#052e16] p-3 text-sm text-[#bbf7d0]">
            {notice}
            {hash && (
              <>
                {' '}
                <a
                  className="underline"
                  href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddr(hash)}
                </a>
              </>
            )}
          </p>
        )}
        {phase !== 'idle' && (
          <p className="mb-3 animate-pulse rounded-lg border border-[#245c3a] bg-[#0c1f16] p-3 text-sm">
            {PHASE_COPY[phase]}
          </p>
        )}

        {tab === 'trade' && (
          <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-[#1f3d2c] bg-[#0c1f16] p-4">
              <div className="mb-3 flex gap-2">
                {MARKETS.map((m) => (
                  <button
                    key={m.symbol}
                    className={`rounded-full px-3 py-1 text-sm ${symbol === m.symbol ? 'bg-[#4ade80] text-[#052e16]' : 'border border-[#245c3a]'}`}
                    onClick={() => setSymbol(m.symbol)}
                  >
                    {m.symbol}
                  </button>
                ))}
              </div>
              <p className="text-sm text-[#9ca3af]">{market.blurb}</p>
              <p className="mt-4 font-mono text-4xl text-white">
                {price === null ? '—' : formatUsd(price)}
              </p>
              <p className="mt-1 text-xs text-[#86efac]">
                Window {windowOpen === null ? '…' : windowOpen ? 'OPEN' : 'CLOSED'} ·
                multiplier {mult === null ? '…' : formatQty(mult)}
              </p>
              <div className="mt-4 flex gap-2">
                {(['mint', 'redeem'] as const).map((s) => (
                  <button
                    key={s}
                    className={`flex-1 rounded-lg py-2 text-sm capitalize ${side === s ? 'bg-[#14532d] text-white' : 'bg-[#07110d]'}`}
                    onClick={() => setSide(s)}
                  >
                    {s === 'mint' ? 'Buy (mint)' : 'Sell (redeem)'}
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-xs uppercase tracking-wide text-[#9ca3af]">
                Quantity
                <input
                  className="mt-1 w-full rounded-lg border border-[#245c3a] bg-[#07110d] px-3 py-3 font-mono text-lg text-white outline-none"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <p className="mt-2 text-sm text-[#9ca3af]">
                Est. {side === 'mint' ? 'cost' : 'payout'}:{' '}
                {quote === null ? '—' : formatUsd(quote)}
              </p>
              <button
                disabled={!address || !ready || phase !== 'idle'}
                className="mt-4 w-full rounded-xl bg-[#4ade80] py-3 font-semibold text-[#052e16] disabled:opacity-40"
                onClick={() =>
                  void run(side === 'mint' ? 'Minted' : 'Redeemed', async () => {
                    const amount = toStroops(qty)
                    if (side === 'mint') {
                      await submitCall({
                        source: address,
                        contractId: CONTRACTS.cash,
                        method: 'approve',
                        args: [
                          addrVal(address),
                          addrVal(CONTRACTS.desk),
                          i128Val(10_000_000n * 10_000_000n),
                        ],
                        onPhase: setPhase,
                      })
                    }
                    const { hash: h } = await submitCall({
                      source: address,
                      contractId: CONTRACTS.desk,
                      method: side,
                      args: [addrVal(address), symVal(symbol), i128Val(amount)],
                      onPhase: setPhase,
                    })
                    return h
                  })
                }
              >
                {side === 'mint' ? 'Mint against mUSD' : 'Redeem to mUSD'}
              </button>
            </div>
            <aside className="rounded-2xl border border-[#1f3d2c] bg-[#0c1f16] p-4">
              <h2 className="text-sm uppercase tracking-wide text-[#9ca3af]">Inventory</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>mUSD</dt>
                  <dd className="font-mono">{cash === null ? '—' : formatUsd(cash)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Raw {symbol}</dt>
                  <dd className="font-mono">{raw === null ? '—' : formatQty(raw)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>UI shares</dt>
                  <dd className="font-mono">{ui === null ? '—' : formatQty(ui)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Mark</dt>
                  <dd className="font-mono">
                    {markValue === null ? '—' : formatUsd(markValue)}
                  </dd>
                </div>
              </dl>
              <button
                disabled={!address || !ready || phase !== 'idle'}
                className="mt-6 w-full rounded-xl border border-[#4ade80] py-3 text-sm text-[#4ade80] disabled:opacity-40"
                onClick={() =>
                  void run('Faucet filled', async () => {
                    const { hash: h } = await submitCall({
                      source: address,
                      contractId: CONTRACTS.cash,
                      method: 'faucet',
                      args: [addrVal(address)],
                      onPhase: setPhase,
                    })
                    return h
                  })
                }
              >
                Get testnet mUSD
              </button>
              <button
                disabled={!address || phase !== 'idle'}
                className="mt-2 w-full rounded-xl border border-[#245c3a] py-3 text-sm disabled:opacity-40"
                onClick={() =>
                  void run('Friendbot funded', async () => {
                    setPhase('submitting')
                    const res = await fetch(
                      `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`,
                    )
                    if (!res.ok) throw new Error(await res.text())
                    return 'friendbot'
                  })
                }
              >
                Fund XLM fees
              </button>
            </aside>
          </section>
        )}

        {tab === 'book' && (
          <section className="rounded-2xl border border-[#1f3d2c] bg-[#0c1f16] p-4">
            <h2 className="text-lg text-white">How the rail works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#d7e4d4]">
              <li>Oracle prints a price. Stale or paused feeds block the desk.</li>
              <li>Primary window must be open (same idea as a tokenization window).</li>
              <li>
                Mint pulls mUSD into the desk and credits raw tokens. Redeem burns
                raw tokens and returns mUSD.
              </li>
              <li>
                Dividends are a multiplier: raw balance stays put, UI shares move.
              </li>
            </ol>
            <p className="mt-4 text-xs text-[#9ca3af]">
              Desk {shortAddr(CONTRACTS.desk || 'undeployed')} · Oracle{' '}
              {shortAddr(CONTRACTS.oracle || 'undeployed')}
            </p>
          </section>
        )}

        {tab === 'tape' && (
          <section className="rounded-2xl border border-[#1f3d2c] bg-[#0c1f16] p-4">
            <h2 className="mb-3 text-lg text-white">Event tape</h2>
            {events.length === 0 ? (
              <p className="text-sm text-[#9ca3af]">No recent contract events yet.</p>
            ) : (
              <ul className="space-y-2 font-mono text-xs">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-[#1f3d2c] bg-[#07110d] p-3"
                  >
                    <div className="text-[#4ade80]">{ev.type}</div>
                    <div className="mt-1 break-all text-[#9ca3af]">{ev.value}</div>
                    <div className="mt-1 text-[#6b7280]">ledger {ev.ledger}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'ops' && (
          <section className="rounded-2xl border border-[#1f3d2c] bg-[#0c1f16] p-4 text-sm">
            <h2 className="text-lg text-white">Operator controls</h2>
            <p className="mt-2 text-[#9ca3af]">
              {isAdmin
                ? 'This wallet is the configured admin.'
                : 'Any wallet can try; the contract will reject unauthorized calls.'}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                disabled={!address || !ready || phase !== 'idle'}
                className="rounded-xl border border-[#245c3a] py-3 disabled:opacity-40"
                onClick={() =>
                  void run('Window opened', async () => {
                    const { hash: h } = await submitCall({
                      source: address,
                      contractId: CONTRACTS.desk,
                      method: 'set_window',
                      args: [boolVal(true)],
                      onPhase: setPhase,
                    })
                    return h
                  })
                }
              >
                Open window
              </button>
              <button
                disabled={!address || !ready || phase !== 'idle'}
                className="rounded-xl border border-[#245c3a] py-3 disabled:opacity-40"
                onClick={() =>
                  void run('Window closed', async () => {
                    const { hash: h } = await submitCall({
                      source: address,
                      contractId: CONTRACTS.desk,
                      method: 'set_window',
                      args: [boolVal(false)],
                      onPhase: setPhase,
                    })
                    return h
                  })
                }
              >
                Close window
              </button>
              <button
                disabled={!address || !ready || phase !== 'idle'}
                className="rounded-xl border border-[#245c3a] py-3 disabled:opacity-40"
                onClick={() =>
                  void run('Oracle paused', async () => {
                    const { hash: h } = await submitCall({
                      source: address,
                      contractId: CONTRACTS.oracle,
                      method: 'set_paused',
                      args: [symVal(symbol), boolVal(true)],
                      onPhase: setPhase,
                    })
                    return h
                  })
                }
              >
                Pause {symbol} oracle
              </button>
              <button
                disabled={!address || !ready || phase !== 'idle'}
                className="rounded-xl border border-[#245c3a] py-3 disabled:opacity-40"
                onClick={() =>
                  void run('Oracle resumed', async () => {
                    const { hash: h } = await submitCall({
                      source: address,
                      contractId: CONTRACTS.oracle,
                      method: 'set_paused',
                      args: [symVal(symbol), boolVal(false)],
                      onPhase: setPhase,
                    })
                    return h
                  })
                }
              >
                Resume {symbol} oracle
              </button>
              <button
                disabled={!address || !ready || phase !== 'idle'}
                className="rounded-xl border border-[#245c3a] py-3 disabled:opacity-40"
                onClick={() =>
                  void run('Price printed', async () => {
                    const next = (price ?? 150_0000000n) + 5_0000000n
                    const { hash: h } = await submitCall({
                      source: address,
                      contractId: CONTRACTS.oracle,
                      method: 'set_price',
                      args: [symVal(symbol), i128Val(next)],
                      onPhase: setPhase,
                    })
                    return h
                  })
                }
              >
                Bump {symbol} price +$5
              </button>
              <button
                disabled={!address || !ready || phase !== 'idle'}
                className="rounded-xl border border-[#245c3a] py-3 disabled:opacity-40"
                onClick={() =>
                  void run('Dividend multiplier applied', async () => {
                    const next = (mult && mult > 0n ? mult : 10_000_000n) + 300_000n
                    const { hash: h } = await submitCall({
                      source: address,
                      contractId: market.equityId,
                      method: 'set_multiplier',
                      args: [i128Val(next)],
                      onPhase: setPhase,
                    })
                    return h
                  })
                }
              >
                Apply +3% dividend
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
