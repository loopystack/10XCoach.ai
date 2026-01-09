import { useEffect, useRef, useState } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  color: string
  life: number
  vx: number
  vy: number
}

const MagicalCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const lastParticleTimeRef = useRef(0)
  const MAX_PARTICLES = 30 // Limit total particles

  // Elegant color palette - refined cyan to purple gradient
  const colors = [
    '#00d4ff', // Cyan
    '#7c3aed', // Purple
    '#a855f7', // Light Purple
  ]

  useEffect(() => {
    let rafId: number
    
    const updateCursor = () => {
      setMousePosition(mousePositionRef.current)
      rafId = requestAnimationFrame(updateCursor)
    }
    
    rafId = requestAnimationFrame(updateCursor)

    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY }

      // Throttle particle creation - only create particles every 16ms (60fps)
      const now = Date.now()
      if (now - lastParticleTimeRef.current > 16 && particlesRef.current.length < MAX_PARTICLES) {
        lastParticleTimeRef.current = now
        
        // Create only 1 particle per move (reduced from 3)
        if (canvasRef.current) {
          const angle = (Math.PI * 2 * Math.random())
          const speed = 0.3 + Math.random() * 0.7
          const particle: Particle = {
            x: e.clientX,
            y: e.clientY,
            size: 2 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          }
          particlesRef.current.push(particle)
          
          // Remove oldest particles if over limit
          if (particlesRef.current.length > MAX_PARTICLES) {
            particlesRef.current.shift()
          }
        }
      }
    }

    const handleMouseEnter = () => setIsHovering(true)
    const handleMouseLeave = () => setIsHovering(false)

    // Check if hovering over interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.style.cursor === 'pointer'
      ) {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseenter', handleMouseEnter)
    window.addEventListener('mouseleave', handleMouseLeave)
    
    // Throttle hover detection
    let hoverCheckTimeout: ReturnType<typeof setTimeout>
    const throttledMouseOver = (e: MouseEvent) => {
      clearTimeout(hoverCheckTimeout)
      hoverCheckTimeout = setTimeout(() => handleMouseOver(e), 50)
    }
    window.addEventListener('mouseover', throttledMouseOver, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseenter', handleMouseEnter)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('mouseover', throttledMouseOver)
      clearTimeout(hoverCheckTimeout)
    }
  }, [])

  useEffect(() => {
    // Set canvas size only once and on resize
    const resizeCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth
        canvasRef.current.height = window.innerHeight
      }
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const animate = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return

      // Use clearRect for better performance
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Only draw if there are particles
      if (particlesRef.current.length > 0) {
        // Update and draw particles
        particlesRef.current = particlesRef.current.filter((particle) => {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.life -= 0.03 // Faster fade
          particle.size *= 0.97
          particle.vx *= 0.96
          particle.vy *= 0.96

          if (particle.life > 0 && particle.size > 0.1) {
            ctx.globalAlpha = particle.life
            ctx.fillStyle = particle.color
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
            ctx.fill()
            return true
          }
          return false
        })
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <>
      {/* Custom Cursor Dot */}
      <div
        ref={cursorRef}
        className="magical-cursor"
        style={{
          left: `${mousePosition.x}px`,
          top: `${mousePosition.y}px`,
          transform: isHovering 
            ? 'translate(-50%, -50%) scale(1.5)' 
            : 'translate(-50%, -50%) scale(1)',
          opacity: isHovering ? 0.8 : 1,
        }}
      >
        <div className="cursor-dot"></div>
        <div className="cursor-outer-ring"></div>
      </div>

      {/* Particle Trail Canvas */}
      <canvas
        ref={canvasRef}
        className="magical-cursor-canvas"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9998,
        }}
      />
    </>
  )
}

export default MagicalCursor

