import React from 'react'
import ReactDOM from 'react-dom/client'
import App8Bit from './App8Bit.tsx'
import './index.css'
import './config/i18n' // Import i18n configuration

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App8Bit />
  </React.StrictMode>,
)
