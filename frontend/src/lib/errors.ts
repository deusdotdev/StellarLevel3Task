const DESK: Record<number, string> = {
  1: 'Already initialized',
  2: 'Contracts are not initialized',
  3: 'Not authorized for this action',
  4: 'Amount must be greater than zero',
  5: 'Unknown market',
  6: 'Primary window is closed — mint/redeem is off',
  7: 'Oracle paused for this instrument (corporate action)',
  8: 'Oracle price is stale — wait for a fresh print',
  9: 'Unknown symbol',
  10: 'Invalid price',
}

export function classifyError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : JSON.stringify(err)

  if (/user closed the modal|User declined|rejected|denied/i.test(raw)) {
    return 'Wallet request cancelled'
  }
  if (/No wallet has been connected/i.test(raw)) {
    return 'Connect a wallet first'
  }
  if (/op_underfunded|#insufficient|no_account|not found/i.test(raw)) {
    return 'Account needs testnet XLM for fees — use Friendbot'
  }

  const codeMatch = raw.match(/Error\(Contract,\s*#(\d+)\)|#(\d+)/)
  const code = codeMatch ? Number(codeMatch[1] || codeMatch[2]) : NaN
  if (Number.isFinite(code) && DESK[code]) return DESK[code]

  if (/stale/i.test(raw)) return DESK[8]
  if (/window/i.test(raw)) return DESK[6]
  if (/paused/i.test(raw)) return DESK[7]

  return raw.slice(0, 180)
}
