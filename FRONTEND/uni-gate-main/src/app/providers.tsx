'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem
      disableTransitionOnChange
      storageKey="uni-gate-theme" // Adicione esta linha
    >
      {children}
    </ThemeProvider>
  )
}