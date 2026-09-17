import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ADMIN, CONTRACTS, contractsReady } from '@/lib/config'
import { classifyError } from '@/lib/errors'
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
} from '@/lib/soroban'
import { connectWallet, disconnectWallet, initWallet } from '@/lib/wallet'
import { toStroops } from '@/lib/format'
import { STOCKS, type Stock } from '@/lib/stocks'

export const PHASE_COPY: Record<TxPhase, string> = {
  idle: '',
  simulating: 'Simulating on RPC…',
  signing: 'Waiting for wallet signature…',
  submitting: 'Broadcasting to Testnet…',
  confirming: 'Waiting for ledger close…',
}

type DeskContextValue = {
  address: string
  ready: boolean
  isAdmin: boolean
  phase: TxPhase
  error: string
  notice: string
  hash: string
  events: ChainEvent[]
  cash: bigint | null
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
  run: (label: string, fn: () => Promise<string>) => Promise<void>
  setPhase: (p: TxPhase) => void
  faucet: () => Promise<void>
  friendbot: () => Promise<void>
  buy: (stock: Stock, qty: string) => Promise<void>
  sell: (stock: Stock, qty: string) => Promise<void>
}

const DeskContext = createContext<DeskContextValue | null>(null)

export function DeskProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState('')
  const [phase, setPhase] = useState<TxPhase>('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hash, setHash] = useState('')
  const [events, setEvents] = useState<ChainEvent[]>([])
  const [cash, setCash] = useState<bigint | null>(null)
  const ready = contractsReady()
  const isAdmin = Boolean(address && ADMIN && address === ADMIN)

  useEffect(() => {
    initWallet()
  }, [])

  const refreshCash = useCallback(async () => {
    if (!ready || !address) return
    try {
      const cashBal = await simulateCall<bigint>(
        address,
        CONTRACTS.cash,
        'balance',
        [addrVal(address)],
      )
      setCash(BigInt(cashBal))
    } catch (e) {
      setError(classifyError(e))
    }
  }, [address, ready])

  useEffect(() => {
    void refreshCash()
  }, [refreshCash])

  useEffect(() => {
    if (!ready) return
    let cancel = false
    const tick = async () => {
      try {
        const ids = [
          CONTRACTS.desk,
          CONTRACTS.oracle,
          CONTRACTS.cash,
          ...STOCKS.map((s) => s.equityId),
        ].filter(Boolean)
        const list = await fetchEvents(ids)
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

  const run = useCallback(async (label: string, fn: () => Promise<string>) => {
    setError('')
    setNotice('')
    setHash('')
    try {
      const h = await fn()
      setHash(h)
      setNotice(label)
      await refreshCash()
    } catch (e) {
      setError(classifyError(e))
    } finally {
      setPhase('idle')
    }
  }, [refreshCash])

  const onConnect = useCallback(async () => {
    setError('')
    try {
      const a = await connectWallet()
      setAddress(a)
    } catch (e) {
      setError(classifyError(e))
    }
  }, [])

  const onDisconnect = useCallback(async () => {
    await disconnectWallet()
    setAddress('')
    setCash(null)
  }, [])

  const faucet = useCallback(async () => {
    await run('Faucet filled', async () => {
      const { hash: h } = await submitCall({
        source: address,
        contractId: CONTRACTS.cash,
        method: 'faucet',
        args: [addrVal(address)],
        onPhase: setPhase,
      })
      return h
    })
  }, [address, run])

  const friendbot = useCallback(async () => {
    await run('Friendbot funded', async () => {
      setPhase('submitting')
      const res = await fetch(
        `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`,
      )
      if (!res.ok) throw new Error(await res.text())
      return 'friendbot'
    })
  }, [address, run])

  const buy = useCallback(
    async (stock: Stock, qty: string) => {
      await run(`Bought ${stock.ticker}`, async () => {
        const amount = toStroops(qty)
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
        const { hash: h } = await submitCall({
          source: address,
          contractId: CONTRACTS.desk,
          method: 'mint',
          args: [addrVal(address), symVal(stock.chainSymbol), i128Val(amount)],
          onPhase: setPhase,
        })
        return h
      })
    },
    [address, run],
  )

  const sell = useCallback(
    async (stock: Stock, qty: string) => {
      await run(`Sold ${stock.ticker}`, async () => {
        const amount = toStroops(qty)
        const { hash: h } = await submitCall({
          source: address,
          contractId: CONTRACTS.desk,
          method: 'redeem',
          args: [addrVal(address), symVal(stock.chainSymbol), i128Val(amount)],
          onPhase: setPhase,
        })
        return h
      })
    },
    [address, run],
  )

  const value = useMemo(
    () => ({
      address,
      ready,
      isAdmin,
      phase,
      error,
      notice,
      hash,
      events,
      cash,
      onConnect,
      onDisconnect,
      run,
      setPhase,
      faucet,
      friendbot,
      buy,
      sell,
    }),
    [
      address,
      ready,
      isAdmin,
      phase,
      error,
      notice,
      hash,
      events,
      cash,
      onConnect,
      onDisconnect,
      run,
      faucet,
      friendbot,
      buy,
      sell,
    ],
  )

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>
}

export function useDesk() {
  const ctx = useContext(DeskContext)
  if (!ctx) throw new Error('useDesk must be used inside DeskProvider')
  return ctx
}

export { boolVal, i128Val, submitCall, simulateCall, addrVal, symVal }
