import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatedNavFramer, type DeskTab } from '@/components/ui/animated-nav-framer'
import { BackgroundPaths, PathHero } from '@/components/ui/background-paths'
import { DeskProvider, useDesk } from '@/lib/desk-context'
import { shortAddr } from '@/lib/format'
import { ExplorePage } from '@/pages/Explore'
import { StockPage } from '@/pages/Stock'
import { TapePage } from '@/pages/Tape'
import { OpsPage } from '@/pages/Ops'

function pathToTab(pathname: string): DeskTab {
  if (pathname.startsWith('/tape')) return 'tape'
  if (pathname.startsWith('/ops')) return 'ops'
  return 'explore'
}

function heroFor(pathname: string): { title: string; compact: boolean } {
  if (pathname.startsWith('/tape')) return { title: 'The Tape', compact: true }
  if (pathname.startsWith('/ops')) return { title: 'Desk Ops', compact: true }
  if (pathname.startsWith('/s/')) {
    const ticker = pathname.split('/')[2] ?? 'AAPL'
    return { title: ticker, compact: true }
  }
  return { title: 'Stock on Stellar', compact: false }
}

function Shell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const {
    address,
    onConnect,
    onDisconnect,
    error,
    notice,
    hash,
  } = useDesk()
  const hero = heroFor(pathname)

  return (
    <BackgroundPaths>
      <div className="min-h-svh text-fog">
        <div className="border-b border-line bg-warn px-4 py-2 text-center text-[13px] font-medium text-on-warn">
          Testnet simulation. These tokens are fictional mocks of well-known names — not
          shares, not investment advice, not 1:1 anything in the real world.
        </div>

        <AnimatedNavFramer
          active={pathToTab(pathname)}
          onSelect={(id) => {
            if (id === 'explore') navigate('/')
            else navigate(`/${id}`)
          }}
        />

        <header className="mx-auto flex max-w-5xl justify-end px-4 pt-16 pb-2">
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

        <PathHero
          key={hero.title}
          title={hero.title}
          compact={hero.compact}
          ctaLabel="Trade AAPL"
          ctaTo="/s/AAPL"
        />

        <main className="mx-auto max-w-5xl px-4 pb-28 sm:pb-12">
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
            <Route path="/" element={<ExplorePage />} />
            <Route path="/s/:ticker" element={<StockPage />} />
            <Route path="/tape" element={<TapePage />} />
            <Route path="/ops" element={<OpsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BackgroundPaths>
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
