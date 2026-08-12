import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { FONT_STYLE } from './theme.js'

const styleTag = document.createElement('style')
styleTag.innerHTML = FONT_STYLE
document.head.appendChild(styleTag)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
