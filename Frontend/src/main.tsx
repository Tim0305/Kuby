import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppAdmin from './AppAdmin.tsx'
import { loadTweakcnPreview } from './tweakcn-preview'

loadTweakcnPreview()

const RootApp = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/') ? AppAdmin : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
