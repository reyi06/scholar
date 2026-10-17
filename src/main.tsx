import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './context/AuthProvider.tsx'
import { ThemeProvider } from './context/ThemeProvider.tsx'
import { ToastProvider } from './context/ToastProvider.tsx'
import { registerServiceWorker } from './lib/serviceWorker.ts'
import './index.css'
import App from './App.tsx'

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
