import { Link } from 'react-router-dom'
import { SilkBackground } from '@/components/ui/silk-background-animation'

export function HomePage() {
  return (
    <SilkBackground className="min-h-[calc(100svh-2.75rem)]">
      <div className="flex min-h-[calc(100svh-2.75rem)] items-center justify-center px-4 pb-16 text-center">
        <div className="max-w-4xl">
          <p className="mb-4 font-mono text-xs tracking-[0.35em] text-accent/80 uppercase">
            Testnet mock equities
          </p>
          <h1
            className="mb-4 text-5xl font-semibold tracking-tighter text-white sm:text-7xl md:text-8xl"
            style={{ textShadow: '0 0 48px rgba(72, 159, 250, 0.14)' }}
          >
            Stock on Stellar
          </h1>
          <p className="mx-auto mb-10 max-w-lg text-sm text-mute sm:text-base">
            Buy and sell ten well-known names against testnet mUSD. Not real shares — a
            Soroban desk demo.
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center rounded-2xl border border-accent/25 bg-black/50 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-accent/10 backdrop-blur-md transition hover:border-accent/50 hover:bg-black/70"
          >
            Explore stocks
            <span className="ml-3 text-accent">→</span>
          </Link>
        </div>
      </div>
    </SilkBackground>
  )
}
