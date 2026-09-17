import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="flex min-h-[calc(100svh-2.75rem)] items-center justify-center bg-ink px-4 pt-28 pb-16 text-center">
      <div className="max-w-4xl">
        <h1 className="mb-8 text-5xl font-bold tracking-tighter text-white sm:text-7xl md:text-8xl">
          Stock on Stellar
        </h1>
        <Link
          to="/s/AAPL"
          className="inline-flex items-center rounded-2xl border border-white/10 bg-black/80 px-8 py-4 text-lg font-semibold text-white transition hover:bg-black"
        >
          Open AAPL
          <span className="ml-3">→</span>
        </Link>
      </div>
    </div>
  )
}
