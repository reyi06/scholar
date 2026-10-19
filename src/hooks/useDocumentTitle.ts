import { useEffect } from 'react'

const SUFFIX = 'Scholar'

/** Set the document title for a page, restoring nothing on unmount. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX
  }, [title])
}
