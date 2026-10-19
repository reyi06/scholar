import { useState } from 'react'
import { Button } from './ui/Button.tsx'
import { Dialog } from './ui/Dialog.tsx'
import { useToast } from '../context/toastContext.ts'

/**
 * Share a listing as a link or a QR code.
 *
 * The QR is generated in the browser, so the link never passes through a
 * third-party image service — which matters here because a listing URL reveals
 * which scholarships a student is looking at.
 *
 * Encoding comes from `qrcode-generator`; the SVG is drawn here. QR is a
 * standardised, intricate algorithm (Reed–Solomon, version selection, masking)
 * whose output cannot be checked by reading it, and a malformed code is
 * indistinguishable from a working one until someone tries to scan it. This is
 * the one dependency in the client added for that reason, and it is confined to
 * this component.
 *
 * The code is always dark-on-white with a four-module quiet zone, in both
 * themes: a QR inverted for dark mode does not scan reliably.
 */

const QUIET_ZONE = 4

interface QrCode {
  path: string
  /** Modules per side, including the quiet zone. */
  size: number
}

/**
 * Encode the URL into modules.
 *
 * The encoder is imported here rather than at module scope so it stays out of
 * the listing page's bundle: most visitors read a listing and never open the
 * share dialog, so the cost belongs to the interaction that needs it.
 */
async function buildQr(text: string): Promise<QrCode> {
  const { default: qrcode } = await import('qrcode-generator')

  // 0 asks the library to choose the smallest version that fits.
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()

  const count = qr.getModuleCount()
  const parts: string[] = []
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (qr.isDark(row, column)) {
        parts.push(`M${column + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`)
      }
    }
  }

  return { path: parts.join(''), size: count + QUIET_ZONE * 2 }
}

export function ShareScholarship({ scholarshipId, name }: { scholarshipId: string; name: string }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)

  // Built at click time rather than at import time: the origin depends on where
  // the page is actually served from, and prerendering has no `window`.
  const [url, setUrl] = useState('')
  const [qr, setQr] = useState<QrCode | null>(null)

  async function openDialog() {
    const next = `${window.location.origin}/scholarships/${scholarshipId}`
    setUrl(next)
    setQr(null)
    setOpen(true)
    setQr(await buildQr(next))
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copyLink() {
    // The Clipboard API needs a secure context and transient user activation;
    // when it is unavailable (or refused), selecting the field and using the
    // legacy command is the difference between working and not.
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied', 'Paste it wherever you need it.')
      return
    } catch {
      // Fall through to the selection-based copy.
    }

    const field = document.getElementById('share-url') as HTMLInputElement | null
    if (field) {
      field.focus()
      field.select()
      try {
        if (document.execCommand('copy')) {
          toast.success('Link copied', 'Paste it wherever you need it.')
          return
        }
      } catch {
        // Reported below.
      }
    }

    toast.error('Could not copy the link', 'Select the address and copy it manually.')
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: name, url })
    } catch {
      // A cancelled share sheet is not an error worth reporting.
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => void openDialog()} className="w-full">
        Share
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Share This Scholarship"
        description={name}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-md bg-white p-3">
              {qr ? (
                <svg
                  viewBox={`0 0 ${qr.size} ${qr.size}`}
                  width={216}
                  height={216}
                  role="img"
                  aria-label={`QR code linking to ${name}`}
                  shapeRendering="crispEdges"
                >
                  <rect width={qr.size} height={qr.size} fill="#ffffff" />
                  <path d={qr.path} fill="#111827" />
                </svg>
              ) : null}
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Point a phone camera at the code to open this listing.
          </p>

          <div>
            <label htmlFor="share-url" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Link
            </label>
            <input
              id="share-url"
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-ink-700 dark:bg-ink-800 dark:text-slate-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void copyLink()}>Copy Link</Button>
            {canNativeShare ? (
              <Button variant="outline" onClick={() => void nativeShare()}>
                Share…
              </Button>
            ) : null}
          </div>
        </div>
      </Dialog>
    </>
  )
}
