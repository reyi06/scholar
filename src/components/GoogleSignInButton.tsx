import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/authContext.ts'

/**
 * "Sign in with Google", using Google Identity Services.
 *
 * GIS is the only supported library: the older `apis.google.com/js/platform.js`
 * and its `gapi.auth2` module were retired on 31 March 2023. Modern GIS runs on
 * FedCM.
 *
 * The button posts a JWT **ID token** back to this page, which is exactly what
 * GIS is designed to do — it is not an OAuth code. The token is opaque to us
 * here: it is forwarded to the API, which verifies the signature against
 * Google's published keys and checks the audience, issuer and expiry. Nothing
 * is trusted client-side, and the client secret never reaches the browser.
 *
 * https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
 */

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: { credential?: string }) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      logo_alignment?: 'left' | 'center'
      width?: number
    },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } }
  }
}

const SCRIPT_ID = 'google-identity-services'
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/** Load the GIS script once, resolving when `window.google` is usable. */
function loadGoogleScript(): Promise<GoogleAccountsId> {
  const existing = window.google?.accounts?.id
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve, reject) => {
    const settled = () => {
      const api = window.google?.accounts?.id
      if (api) resolve(api)
      else reject(new Error('Google sign-in could not be loaded.'))
    }

    const present = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (present) {
      present.addEventListener('load', settled, { once: true })
      present.addEventListener('error', () => reject(new Error('Google sign-in could not be loaded.')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = settled
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'))
    document.head.appendChild(script)
  })
}

export function GoogleSignInButton({ onError }: { onError?: (message: string) => void }) {
  const { googleEnabled, googleClientId, signInWithGoogle } = useAuth()
  const container = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  // Keep the latest callbacks without making them effect dependencies: they are
  // inline arrows at the call site and would otherwise re-initialise GIS on
  // every render. `setBusy` is deliberately not stored here — a state setter is
  // already stable, and holding it would make this effect look like it sets
  // state on every render.
  const handlerRef = useRef({ signInWithGoogle, onError })
  useEffect(() => {
    handlerRef.current = { signInWithGoogle, onError }
  })

  useEffect(() => {
    if (!googleEnabled || !googleClientId) return undefined
    let cancelled = false

    loadGoogleScript()
      .then((api) => {
        if (cancelled || !container.current) return

        api.initialize({
          client_id: googleClientId,
          cancel_on_tap_outside: true,
          callback: (response) => {
            const credential = response.credential
            if (!credential) {
              handlerRef.current.onError?.('Google did not return a sign-in token. Try again.')
              return
            }
            setBusy(true)
            handlerRef.current
              .signInWithGoogle(credential)
              .catch((cause: unknown) => {
                handlerRef.current.onError?.(
                  cause instanceof Error ? cause.message : 'Google sign-in failed. Try again.',
                )
              })
              .finally(() => setBusy(false))
          },
        })

        // A fixed width keeps the button the same size as the form controls
        // above it; it does not respond to its container on its own.
        api.renderButton(container.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 320,
        })
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          handlerRef.current.onError?.(
            cause instanceof Error ? cause.message : 'Google sign-in could not be loaded.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [googleEnabled, googleClientId])

  // Not configured on this deployment: show nothing rather than a control that
  // cannot work (business rule 10).
  if (!googleEnabled) return null

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={container} aria-busy={busy} />
      {busy ? (
        <p role="status" className="text-xs text-slate-500 dark:text-slate-400">
          Signing you in…
        </p>
      ) : null}
    </div>
  )
}
