import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.ts'
import { BrandingProvider } from './shared/branding/BrandingProvider.tsx'
import './index.css'
import "sileo/styles.css"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrandingProvider>
        <App />
      </BrandingProvider>
    </AuthProvider>
  </React.StrictMode>,
)
