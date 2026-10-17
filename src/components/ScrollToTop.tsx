import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * Scroll the window to the top whenever the route path changes.
 * Without this, navigating from a scrolled listing to a detail page leaves the
 * user halfway down the new page.
 */
export function ScrollToTop(): null {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
