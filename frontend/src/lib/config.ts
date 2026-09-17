import { Networks } from '@stellar/stellar-sdk'

export const SCALE = 10_000_000n
export const FAUCET_AMOUNT = 10_000n * SCALE

export const RPC_URL =
  import.meta.env.VITE_RPC_URL ?? 'https://soroban-testnet.stellar.org'
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ?? Networks.TESTNET
export const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL ?? 'https://horizon-testnet.stellar.org'

export const CONTRACTS = {
  cash: import.meta.env.VITE_CASH_ID ?? '',
  oracle: import.meta.env.VITE_ORACLE_ID ?? '',
  desk: import.meta.env.VITE_DESK_ID ?? '',
}

export const ADMIN = import.meta.env.VITE_ADMIN ?? ''

export function contractsReady(): boolean {
  return Boolean(CONTRACTS.cash && CONTRACTS.oracle && CONTRACTS.desk)
}
