import { SCALE } from './config'

export function fromStroops(raw: bigint | number | string, digits = 7): string {
  const n = BigInt(raw)
  const neg = n < 0n
  const abs = neg ? -n : n
  const base = 10n ** BigInt(digits)
  const whole = abs / base
  const frac = abs % base
  const fracStr = frac.toString().padStart(digits, '0').replace(/0+$/, '')
  const body = fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString()
  return neg ? `-${body}` : body
}

export function toStroops(input: string, digits = 7): bigint {
  const trimmed = input.trim()
  if (!trimmed || trimmed === '.') throw new Error('Enter an amount')
  const neg = trimmed.startsWith('-')
  const [w, f = ''] = (neg ? trimmed.slice(1) : trimmed).split('.')
  if (!/^\d*$/.test(w) || !/^\d*$/.test(f) || f.length > digits) {
    throw new Error('Invalid amount')
  }
  const frac = (f + '0'.repeat(digits)).slice(0, digits)
  const value = BigInt(w || '0') * 10n ** BigInt(digits) + BigInt(frac || '0')
  return neg ? -value : value
}

export function formatUsd(raw: bigint | number): string {
  const n = Number(fromStroops(raw))
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

export function formatQty(raw: bigint | number): string {
  return Number(fromStroops(raw)).toLocaleString('en-US', {
    maximumFractionDigits: 4,
  })
}

/** UI shares = raw * multiplier / SCALE, matching the equity contract. */
export function balanceUi(raw: bigint, multiplier: bigint): bigint {
  return (raw * multiplier) / SCALE
}

export function shortAddr(addr: string): string {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}
