import { Networks } from '@stellar/stellar-sdk'
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit/sdk'
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils'
import { NETWORK_PASSPHRASE } from './config'

let started = false

export function initWallet() {
  if (started) return
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: NETWORK_PASSPHRASE as typeof Networks.TESTNET,
  })
  started = true
}

export async function connectWallet(): Promise<string> {
  initWallet()
  const { address } = await StellarWalletsKit.authModal()
  return address
}

export async function disconnectWallet(): Promise<void> {
  initWallet()
  await StellarWalletsKit.disconnect()
}

export async function signXdr(xdr: string, address: string): Promise<string> {
  initWallet()
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  })
  return signedTxXdr
}
