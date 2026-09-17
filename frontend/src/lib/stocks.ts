import { CONTRACTS } from './config'

export type StockTicker =
  | 'AAPL'
  | 'NVDA'
  | 'GOOGL'
  | 'MSFT'
  | 'AMZN'
  | 'META'
  | 'TSLA'
  | 'AVGO'
  | 'JPM'
  | 'LLY'

export type Stock = {
  ticker: StockTicker
  chainSymbol: StockTicker
  name: string
  sector: string
  /** Fallback print while the oracle is unreachable. */
  mockPrice: bigint
  equityId: string
}

function envId(...keys: (keyof ImportMetaEnv)[]): string {
  for (const key of keys) {
    const value = import.meta.env[key]
    if (value) return value
  }
  return ''
}

export const STOCKS: Stock[] = [
  {
    ticker: 'AAPL',
    chainSymbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Tech',
    mockPrice: 227_0000000n,
    equityId: envId('VITE_AAPL_ID'),
  },
  {
    ticker: 'NVDA',
    chainSymbol: 'NVDA',
    name: 'NVIDIA Corp.',
    sector: 'Tech',
    mockPrice: 178_0000000n,
    equityId: envId('VITE_NVDA_ID'),
  },
  {
    ticker: 'GOOGL',
    chainSymbol: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Tech',
    mockPrice: 165_0000000n,
    equityId: envId('VITE_GOOGL_ID'),
  },
  {
    ticker: 'MSFT',
    chainSymbol: 'MSFT',
    name: 'Microsoft Corp.',
    sector: 'Tech',
    mockPrice: 415_0000000n,
    equityId: envId('VITE_MSFT_ID'),
  },
  {
    ticker: 'AMZN',
    chainSymbol: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Consumer',
    mockPrice: 186_0000000n,
    equityId: envId('VITE_AMZN_ID'),
  },
  {
    ticker: 'META',
    chainSymbol: 'META',
    name: 'Meta Platforms',
    sector: 'Tech',
    mockPrice: 512_0000000n,
    equityId: envId('VITE_META_ID'),
  },
  {
    ticker: 'TSLA',
    chainSymbol: 'TSLA',
    name: 'Tesla Inc.',
    sector: 'Auto',
    mockPrice: 248_0000000n,
    equityId: envId('VITE_TSLA_ID'),
  },
  {
    ticker: 'AVGO',
    chainSymbol: 'AVGO',
    name: 'Broadcom Inc.',
    sector: 'Tech',
    mockPrice: 172_0000000n,
    equityId: envId('VITE_AVGO_ID'),
  },
  {
    ticker: 'JPM',
    chainSymbol: 'JPM',
    name: 'JPMorgan Chase',
    sector: 'Finance',
    mockPrice: 198_0000000n,
    equityId: envId('VITE_JPM_ID'),
  },
  {
    ticker: 'LLY',
    chainSymbol: 'LLY',
    name: 'Eli Lilly & Co.',
    sector: 'Health',
    mockPrice: 812_0000000n,
    equityId: envId('VITE_LLY_ID'),
  },
]

export function isListed(stock: Stock): boolean {
  return Boolean(stock.equityId && CONTRACTS.desk && CONTRACTS.oracle && CONTRACTS.cash)
}

export function getStock(ticker: string | undefined): Stock | undefined {
  return STOCKS.find((s) => s.ticker === ticker)
}
