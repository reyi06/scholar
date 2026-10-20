import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerServiceWorker } from './lib/serviceWorker.ts'
import { App } from './app/App.tsx'
import { Providers } from './app/Providers.tsx'
import './styles/index.css'

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)
