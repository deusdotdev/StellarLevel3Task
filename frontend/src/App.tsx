import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatedNavFramer, type DeskTab } from '@/components/ui/animated-nav-framer'
import { DeskProvider, useDesk } from '@/lib/desk-context'
import { shortAddr } from '@/lib/format'
import { ExplorePage } from '@/pages/Explore'
import { HomePage } from '@/pages/Home'
import { StockPage } from '@/pages/Stock'

function pathToTab(pathname: string): DeskTab | null {
  if (pathname === '/') return null
  return 'explore'
}

function Shell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const {
    address,
    onConnect,
    onDisconnect,
    error,
    notice,
    hash,
  } = useDesk()

  return (
    <div className="min-h-svh bg-ink text-fog">
      <div className="relative z-40 border-b border-line bg-warn px-4 py-2 text-center text-[13px] font-medium text-on-warn">
        Testnet simulation. These tokens are fictional mocks of well-known names — not
        shares, not investment advice, not 1:1 anything in the real world.
      </div>

      <AnimatedNavFramer
        active={pathToTab(pathname)}
        onLogo={() => navigate('/')}
        onSelect={() => navigate('/explore')}
      />

      {isHome ? (
        <HomePage />
      ) : (
        <>
          <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-16 pb-4 sm:px-6">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] text-accent">
                STOCK ON STELLAR
              </p>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">
                Mock tokenized names
              </h1>
            </div>
            {address ? (
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-line bg-glass px-3 py-1 font-mono text-xs">
                  {shortAddr(address)}
                </span>
                <button className="text-xs text-accent underline" onClick={() => void onDisconnect()}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent"
                onClick={() => void onConnect()}
              >
                Connect wallet
              </button>
            )}
          </header>

          <main className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 sm:pb-12">
            {error && (
              <p className="mb-3 rounded-lg border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">
                {error}
              </p>
            )}
            {notice && (
              <p className="mb-3 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
                {notice}
                {hash && hash !== 'friendbot' && (
                  <>
                    {' '}
                    <a
                      className="underline"
                      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortAddr(hash)}
                    </a>
                  </>
                )}
              </p>
            )}
            <Routes>
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/s/:ticker" element={<StockPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DeskProvider>
        <Shell />
      </DeskProvider>
    </BrowserRouter>
  )
}
