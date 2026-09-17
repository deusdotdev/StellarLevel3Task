import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }))

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + (path.id % 10),
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export function BackgroundPaths({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative min-h-svh w-full overflow-x-hidden bg-ink">
      <div className="pointer-events-none absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export function PathHero({
  title = 'Stock on Stellar',
  ctaLabel = 'Trade AAPL',
  ctaTo = '/s/AAPL',
  compact = false,
}: {
  title?: string
  ctaLabel?: string
  ctaTo?: string
  compact?: boolean
}) {
  const words = title.split(' ')

  return (
    <div
      className={cn(
        'relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center md:px-6',
        compact ? 'py-8' : 'min-h-[min(70vh,36rem)] justify-center py-12',
      )}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="max-w-4xl"
      >
        <h1
          className={cn(
            'mb-8 font-bold tracking-tighter',
            compact ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-7xl md:text-8xl',
          )}
        >
          {words.map((word, wordIndex) => (
            <span key={wordIndex} className="mr-4 inline-block last:mr-0">
              {word.split('').map((letter, letterIndex) => (
                <motion.span
                  key={`${wordIndex}-${letterIndex}`}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: wordIndex * 0.1 + letterIndex * 0.03,
                    type: 'spring',
                    stiffness: 150,
                    damping: 25,
                  }}
                  className="inline-block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent"
                >
                  {letter}
                </motion.span>
              ))}
            </span>
          ))}
        </h1>

        <div className="group relative inline-block overflow-hidden rounded-2xl bg-gradient-to-b from-white/10 to-black/10 p-px shadow-lg backdrop-blur-lg transition-shadow duration-300 hover:shadow-xl">
          <Button
            to={ctaTo}
            variant="ghost"
            className="rounded-[1.15rem] border border-white/10 bg-black/95 px-8 py-6 text-lg font-semibold text-white backdrop-blur-md transition-all duration-300 group-hover:-translate-y-0.5 hover:bg-black hover:shadow-md"
          >
            <span className="opacity-90 transition-opacity group-hover:opacity-100">
              {ctaLabel}
            </span>
            <span className="ml-3 opacity-70 transition-all duration-300 group-hover:translate-x-1.5 group-hover:opacity-100">
              →
            </span>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
