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

      <header className="sticky top-0 z-50 border-b border-line/50 bg-ink/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="justify-self-start font-mono text-[11px] tracking-[0.22em] text-accent transition hover:text-white sm:text-xs"
          >
            STOCK ON STELLAR
          </button>

          {!isHome ? (
            <AnimatedNavFramer
              active={pathToTab(pathname)}
              onSelect={() => navigate('/explore')}
            />
          ) : (
            <span />
          )}

          <div className="flex items-center justify-self-end">
            {address ? (
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-line bg-glass px-2.5 py-1 font-mono text-[11px] sm:px-3 sm:text-xs">
                  {shortAddr(address)}
                </span>
                <button
                  className="text-[11px] text-accent underline sm:text-xs"
                  onClick={() => void onDisconnect()}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent sm:px-4 sm:py-2 sm:text-sm"
                onClick={() => void onConnect()}
              >
                Connect wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {isHome ? (
        <HomePage />
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12">
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
