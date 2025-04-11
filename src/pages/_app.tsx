import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';

// Global styles
import '@/styles/globals.css';

/**
 * Initialize server-side components if running on the server
 */
if (typeof window === 'undefined') {
  // Dynamic import for server-side only code
  import('../workers').then(({ initializeWorkers }) => {
    // Initialize background workers
    initializeWorkers();
  }).catch(error => {
    console.error('Failed to initialize workers:', error);
  });
}

/**
 * Main application component
 * Wraps all pages with providers and initializes services
 */
export default function App({ 
  Component, 
  pageProps: { session, ...pageProps } 
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Component {...pageProps} />
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
} 