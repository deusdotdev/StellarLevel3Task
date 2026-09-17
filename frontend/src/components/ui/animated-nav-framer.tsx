import { useRef, useState, type MouseEvent } from 'react'
import { motion, useMotionValueEvent, useScroll, type Variants } from 'motion/react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DeskTab = 'explore'

const navItems: { name: string; id: DeskTab }[] = [
  { name: 'Explore', id: 'explore' },
]

const EXPAND_SCROLL_THRESHOLD = 80

const containerVariants: Variants = {
  expanded: {
    y: 0,
    opacity: 1,
    width: 'auto',
    transition: {
      y: { type: 'spring', damping: 18, stiffness: 250 },
      opacity: { duration: 0.3 },
      type: 'spring',
      damping: 20,
      stiffness: 300,
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
  collapsed: {
    y: 0,
    opacity: 1,
    width: '2.75rem',
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 300,
      when: 'afterChildren',
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
}

const itemVariants: Variants = {
  expanded: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', damping: 15 },
  },
  collapsed: { opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } },
}

const collapsedIconVariants: Variants = {
  expanded: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  collapsed: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 300,
      delay: 0.15,
    },
  },
}

export function AnimatedNavFramer({
  active,
  onSelect,
}: {
  active: DeskTab | null
  onSelect: (tab: DeskTab) => void
}) {
  const [isExpanded, setExpanded] = useState(true)
  const { scrollY } = useScroll()
  const lastScrollY = useRef(0)
  const scrollPositionOnCollapse = useRef(0)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = lastScrollY.current

    if (isExpanded && latest > previous && latest > 150) {
      setExpanded(false)
      scrollPositionOnCollapse.current = latest
    } else if (
      !isExpanded &&
      latest < previous &&
      scrollPositionOnCollapse.current - latest > EXPAND_SCROLL_THRESHOLD
    ) {
      setExpanded(true)
    }

    lastScrollY.current = latest
  })

  const handleNavClick = (e: MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault()
      setExpanded(true)
    }
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -6 }}
      animate={isExpanded ? 'expanded' : 'collapsed'}
      variants={containerVariants}
      whileHover={!isExpanded ? { scale: 1.04 } : undefined}
      whileTap={!isExpanded ? { scale: 0.97 } : undefined}
      onClick={handleNavClick}
      className={cn(
        'relative flex h-9 items-center overflow-hidden rounded-full border border-line/70 bg-glass shadow-md shadow-black/30 backdrop-blur-sm',
        !isExpanded && 'cursor-pointer justify-center',
      )}
    >
      <motion.div
        className={cn(
          'flex items-center gap-0.5 px-1 sm:gap-1 sm:px-2',
          !isExpanded && 'pointer-events-none',
        )}
      >
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            variants={itemVariants}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(item.id)
            }}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              active === item.id ? 'text-accent' : 'text-mute hover:text-fog',
            )}
          >
            {item.name}
          </motion.button>
        ))}
      </motion.div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          variants={collapsedIconVariants}
          animate={isExpanded ? 'expanded' : 'collapsed'}
        >
          <Menu className="h-4 w-4 text-fog" />
        </motion.div>
      </div>
    </motion.nav>
  )
}
