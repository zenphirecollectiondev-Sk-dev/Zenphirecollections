import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min global default
      gcTime: 10 * 60 * 1000,   // keep unused cache for 10 min
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// Hide the premium global preloader once React has mounted
setTimeout(() => {
  if (typeof window !== 'undefined' && (window as any).hideZenphirePreloader) {
    (window as any).hideZenphirePreloader();
  }
}, 300);
