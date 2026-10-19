import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Content Security Policy for the built application.
 *
 * `'unsafe-inline'` for scripts is required by the small theme bootstrap in
 * `index.html`, which must run before first paint to avoid a flash of the wrong
 * theme. Everything else is locked down: no object embedding, no framing, forms
 * may only post to this origin, and network access is limited to this origin and
 * Google Identity Services (used by the sign-in button).
 *
 * `upgrade-insecure-requests` is deliberately absent here: the preview server
 * runs over plain HTTP, and that directive would rewrite every request to HTTPS
 * and break it. It is set in `vercel.json`, where TLS is guaranteed.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https://accounts.google.com",
  "frame-src https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxying the API keeps it same-origin during development, so the session
    // cookie works without cross-origin cookie rules. The server owns the
    // database; the browser never talks to it directly.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT ?? 8787}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    // The built application is served with the policy it will have in
    // production, so a CSP violation is found here rather than after deployment.
    headers: SECURITY_HEADERS,
  },
})
