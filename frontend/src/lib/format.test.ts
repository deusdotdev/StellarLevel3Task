import { describe, expect, it } from 'vitest'
import { SCALE } from './config'
import { balanceUi, fromStroops, toStroops } from './format'
import { classifyError } from './errors'

describe('format', () => {
  it('converts stroops to decimal strings', () => {
    expect(fromStroops(150_0000000n)).toBe('150')
    expect(fromStroops(2_0600000n)).toBe('2.06')
    expect(fromStroops(1n)).toBe('0.0000001')
  })

  it('parses user input back to stroops', () => {
    expect(toStroops('2')).toBe(2_0000000n)
    expect(toStroops('150.5')).toBe(150_5000000n)
  })

  it('scales raw balances by the corporate-action multiplier', () => {
    const raw = 2_0000000n
    const multiplier = 10_300_000n
    expect(balanceUi(raw, multiplier)).toBe(2_0600000n)
    expect(multiplier).toBeGreaterThan(SCALE)
  })
})

describe('errors', () => {
  it('maps desk contract codes to user copy', () => {
    expect(classifyError('Error(Contract, #6)')).toMatch(/window is closed/i)
    expect(classifyError('Error(Contract, #8)')).toMatch(/stale/i)
    expect(classifyError('Error(Contract, #7)')).toMatch(/paused/i)
  })

  it('maps wallet cancel and unfunded accounts', () => {
    expect(classifyError('The user closed the modal.')).toMatch(/cancelled/i)
    expect(classifyError('op_underfunded')).toMatch(/Friendbot/i)
  })
})
