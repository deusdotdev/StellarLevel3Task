import { useState } from 'react'
import { CONTRACTS } from '@/lib/config'
import { STOCKS, type StockTicker } from '@/lib/stocks'
import {
  boolVal,
  i128Val,
  submitCall,
  symVal,
  useDesk,
} from '@/lib/desk-context'

export function OpsPage() {
  const { address, ready, phase, isAdmin, run, setPhase } = useDesk()
  const [ticker, setTicker] = useState<StockTicker>(STOCKS[0].ticker)
  const stock = STOCKS.find((s) => s.ticker === ticker)!

  return (
    <section className="rounded-2xl border border-line bg-glass p-4 text-sm">
      <h1 className="text-2xl font-semibold text-white">Ops</h1>
      <p className="mt-2 text-mute">
        {isAdmin
          ? 'This wallet is the configured issuer admin.'
          : 'Any wallet can try; the contract will reject unauthorized calls.'}
      </p>
      <label className="mt-4 block text-xs uppercase tracking-wide text-mute">
        Symbol
        <select
          className="mt-1 w-full rounded-lg border border-line bg-black/35 px-3 py-2 text-white"
          value={ticker}
          onChange={(e) => setTicker(e.target.value as StockTicker)}
        >
          {STOCKS.map((s) => (
            <option key={s.ticker} value={s.ticker}>
              {s.ticker}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          disabled={!address || !ready || phase !== 'idle'}
          className="rounded-xl border border-line py-3 disabled:opacity-40"
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
          className="rounded-xl border border-line py-3 disabled:opacity-40"
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
          className="rounded-xl border border-line py-3 disabled:opacity-40"
          onClick={() =>
            void run('Oracle paused', async () => {
              const { hash: h } = await submitCall({
                source: address,
                contractId: CONTRACTS.oracle,
                method: 'set_paused',
                args: [symVal(stock.chainSymbol), boolVal(true)],
                onPhase: setPhase,
              })
              return h
            })
          }
        >
          Pause {stock.ticker}
        </button>
        <button
          disabled={!address || !ready || phase !== 'idle'}
          className="rounded-xl border border-line py-3 disabled:opacity-40"
          onClick={() =>
            void run('Oracle resumed', async () => {
              const { hash: h } = await submitCall({
                source: address,
                contractId: CONTRACTS.oracle,
                method: 'set_paused',
                args: [symVal(stock.chainSymbol), boolVal(false)],
                onPhase: setPhase,
              })
              return h
            })
          }
        >
          Resume {stock.ticker}
        </button>
        <button
          disabled={!address || !ready || phase !== 'idle' || !stock.equityId}
          className="rounded-xl border border-line py-3 disabled:opacity-40"
          onClick={() =>
            void run('Dividend multiplier applied', async () => {
              const { hash: h } = await submitCall({
                source: address,
                contractId: stock.equityId,
                method: 'set_multiplier',
                args: [i128Val(10_300_000n)],
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
  )
}
