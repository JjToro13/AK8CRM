import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { BrandingProvider } from './shared/branding/BrandingProvider.tsx'
import './index.css'
import "sileo/styles.css"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrandingProvider>
      <App />
    </BrandingProvider>
  </React.StrictMode>,
)
