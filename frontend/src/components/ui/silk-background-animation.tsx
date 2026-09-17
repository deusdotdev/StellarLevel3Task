import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SilkBackgroundProps = {
  children?: ReactNode
  className?: string
}

export function SilkBackground({ children, className }: SilkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoaded(true), 200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let time = 0
    const speed = 0.02
    const scale = 2
    const noiseIntensity = 0.75
    const pixelStep = 2
    const renderScale = 0.55

    const resizeCanvas = () => {
      const w = Math.floor(window.innerWidth * renderScale)
      const h = Math.floor(window.innerHeight * renderScale)
      canvas.width = w
      canvas.height = h
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }

    const noise = (x: number, y: number) => {
      const g = 2.71828
      const rx = g * Math.sin(g * x)
      const ry = g * Math.sin(g * y)
      return (rx * ry * (1 + x)) % 1
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const animate = () => {
      const { width, height } = canvas

      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#040810')
      gradient.addColorStop(0.5, '#0a1628')
      gradient.addColorStop(1, '#05070d')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      const imageData = ctx.createImageData(width, height)
      const data = imageData.data

      for (let x = 0; x < width; x += pixelStep) {
        for (let y = 0; y < height; y += pixelStep) {
          const u = (x / width) * scale
          const v = (y / height) * scale
          const tOffset = speed * time
          const texX = u
          const texY = v + 0.03 * Math.sin(8 * texX - tOffset)

          const pattern =
            0.6 +
            0.4 *
              Math.sin(
                5 *
                  (texX +
                    texY +
                    Math.cos(3 * texX + 5 * texY) +
                    0.02 * tOffset) +
                  Math.sin(20 * (texX + texY - 0.1 * tOffset)),
              )

          const rnd = noise(x, y)
          const intensity = Math.max(0, pattern - (rnd / 15) * noiseIntensity)

          const r = Math.floor((30 + 95 * intensity) * intensity)
          const g = Math.floor((70 + 120 * intensity) * intensity)
          const b = Math.floor((110 + 140 * intensity) * intensity)

          for (let dx = 0; dx < pixelStep && x + dx < width; dx++) {
            for (let dy = 0; dy < pixelStep && y + dy < height; dy++) {
              const index = ((y + dy) * width + (x + dx)) * 4
              data[index] = r
              data[index + 1] = g
              data[index + 2] = b
              data[index + 3] = 255
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0)

      const overlayGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 2,
      )
      overlayGradient.addColorStop(0, 'rgba(4, 8, 16, 0.05)')
      overlayGradient.addColorStop(1, 'rgba(4, 8, 16, 0.55)')
      ctx.fillStyle = overlayGradient
      ctx.fillRect(0, 0, width, height)

      time += 1
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <div className={cn('relative w-full overflow-hidden bg-ink', className)}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-ink/20 via-transparent to-ink/70" />
      <div
        className={cn(
          'relative z-20 transition-opacity duration-700',
          isLoaded ? 'opacity-100' : 'opacity-0',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { SilkBackground as Component }
