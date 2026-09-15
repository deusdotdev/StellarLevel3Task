import {
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk'

type ScVal = ReturnType<typeof nativeToScVal>
import { NETWORK_PASSPHRASE, RPC_URL } from './config'
import { signXdr } from './wallet'

export type TxPhase =
  | 'idle'
  | 'simulating'
  | 'signing'
  | 'submitting'
  | 'confirming'

const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') })

export function addrVal(a: string) {
  return Address.fromString(a).toScVal()
}

export function i128Val(n: bigint) {
  return nativeToScVal(n, { type: 'i128' })
}

export function symVal(s: string) {
  return nativeToScVal(s, { type: 'symbol' })
}

export function boolVal(b: boolean) {
  return nativeToScVal(b, { type: 'bool' })
}

export function strVal(s: string) {
  return nativeToScVal(s, { type: 'string' })
}

async function builtTx(
  source: string,
  contractId: string,
  method: string,
  args: ScVal[],
) {
  const account = await server.getAccount(source)
  const contract = new Contract(contractId)
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build()
}

export async function simulateCall<T>(
  source: string,
  contractId: string,
  method: string,
  args: ScVal[],
): Promise<T> {
  const tx = await builtTx(source, contractId, method, args)
  const sim = await server.simulateTransaction(tx)
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    const msg =
      rpc.Api.isSimulationError(sim) ? sim.error : `Simulation failed for ${method}`
    throw new Error(msg)
  }
  return scValToNative(sim.result.retval) as T
}

export async function submitCall<T>(opts: {
  source: string
  contractId: string
  method: string
  args: ScVal[]
  onPhase?: (phase: TxPhase) => void
}): Promise<{ hash: string; result: T }> {
  const { source, contractId, method, args, onPhase } = opts
  onPhase?.('simulating')
  const tx = await builtTx(source, contractId, method, args)
  const prepared = await server.prepareTransaction(tx)
  onPhase?.('signing')
  const signedXdr = await signXdr(prepared.toXDR(), source)
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  onPhase?.('submitting')
  const sent = await server.sendTransaction(signed)
  if (sent.status === 'ERROR' || sent.status === 'DUPLICATE') {
    throw new Error(sent.errorResult?.toXDR('base64') ?? sent.status)
  }
  if (sent.status === 'TRY_AGAIN_LATER') {
    throw new Error('Network busy, try again')
  }
  onPhase?.('confirming')
  const hash = sent.hash
  for (let i = 0; i < 30; i++) {
    const got = await server.getTransaction(hash)
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      const meta = got.returnValue
      return { hash, result: (meta ? scValToNative(meta) : undefined) as T }
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${hash}`)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Timed out waiting for ${hash}`)
}

export async function getLatestLedger(): Promise<number> {
  const { sequence } = await server.getLatestLedger()
  return sequence
}

export type ChainEvent = {
  id: string
  type: string
  contractId?: string
  ledger: number
  value: string
}

export async function fetchEvents(contractIds: string[], lookback = 2000): Promise<ChainEvent[]> {
  const ids = contractIds.filter(Boolean)
  if (!ids.length) return []
  const latest = await getLatestLedger()
  const startLedger = Math.max(1, latest - lookback)
  const page = await server.getEvents({
    startLedger,
    filters: [{ type: 'contract', contractIds: ids }],
    limit: 40,
  })
  return page.events.map((ev) => {
    const topics = (ev.topic ?? []).map((t) => {
      try {
        return String(scValToNative(t))
      } catch {
        return t.toXDR('base64').slice(0, 12)
      }
    })
    let value = ''
    try {
      value = JSON.stringify(scValToNative(ev.value))
    } catch {
      value = ''
    }
    return {
      id: ev.id,
      type: topics[0] || ev.type,
      contractId: ev.contractId ? String(ev.contractId) : undefined,
      ledger: ev.ledger,
      value: [topics.slice(1).join(' · '), value].filter(Boolean).join(' — '),
    }
  })
}
