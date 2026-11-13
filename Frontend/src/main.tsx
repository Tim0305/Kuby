import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import AppRoot from '@/AppRoot.tsx'
import { loadTweakcnPreview } from '@/tweakcn-preview'

loadTweakcnPreview()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)
