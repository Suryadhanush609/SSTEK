import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SWRConfig } from 'swr'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SWRConfig
      value={{
        onError: (error) => console.error('SWR Error:', error.message),
        revalidateOnFocus: false,
        shouldRetryOnError: true,
        errorRetryCount: 3,
      }}
    >
      <App />
    </SWRConfig>
  </StrictMode>,
)
