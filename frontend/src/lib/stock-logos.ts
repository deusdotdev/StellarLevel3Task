import type { StockTicker } from '@/lib/stocks'

/** Issuer domains for Clearbit fallback when the primary logo CDN misses. */
const LOGO_DOMAINS: Record<StockTicker, string> = {
  AAPL: 'apple.com',
  NVDA: 'nvidia.com',
  GOOGL: 'abc.xyz',
  MSFT: 'microsoft.com',
  AMZN: 'amazon.com',
  META: 'meta.com',
  TSLA: 'tesla.com',
  AVGO: 'broadcom.com',
  JPM: 'jpmorganchase.com',
  LLY: 'lilly.com',
}

export function stockLogoSources(ticker: StockTicker): string[] {
  const domain = LOGO_DOMAINS[ticker]
  return [
    `https://financialmodelingprep.com/image-stock/${ticker}.png`,
    `https://logo.clearbit.com/${domain}?size=128`,
  ]
}
