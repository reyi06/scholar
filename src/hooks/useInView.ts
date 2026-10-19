import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * True once the element has scrolled into view, and stays true.
 *
 * Used to start the illustration draw-on when it is actually looked at. Falls
 * back to true when IntersectionObserver is unavailable, so the artwork is
 * always visible rather than stuck undrawn.
 */
export function useInView<T extends Element>(
  // Fires before the element enters the viewport, so a reveal animation starts
  // off-screen rather than flashing a repaint the user can see.
  rootMargin = '0px 0px 160px 0px',
): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  const supported = typeof IntersectionObserver !== 'undefined'

  useEffect(() => {
    const node = ref.current
    if (!node || seen || !supported) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [seen, supported, rootMargin])

  return { ref, inView: seen || !supported }
}
