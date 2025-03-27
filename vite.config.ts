import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { tempo } from "tempo-devtools/dist/vite";

const conditionalPlugins: [string, Record<string, any>][] = [];

// @ts-ignore
if (process.env.TEMPO === "true") {
  conditionalPlugins.push(["tempo-devtools/swc", {}]);
}

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "development" ? "/" : process.env.VITE_BASE_PATH || "/",
  optimizeDeps: {
    entries: ["src/main.tsx", "src/tempobook/**/*"],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-table',
      'date-fns',
      'lucide-react',
      '@supabase/supabase-js'
    ]
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // UI and Table dependencies
          'vendor-ui': ['@tanstack/react-table', 'lucide-react', '@radix-ui/react-slot'],
          
          // Utility libraries
          'vendor-utils': ['date-fns', '@supabase/supabase-js'],
          
          // Form handling
          'vendor-forms': ['react-hook-form', 'zod'],
          
          // Dialog and Modal components
          'vendor-dialogs': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-alert-dialog'
          ],
          
          // Interactive components
          'vendor-interactive': [
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-accordion',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-switch',
            '@radix-ui/react-toggle'
          ],
          
          // Icons
          'vendor-icons': ['@radix-ui/react-icons']
        }
      }
    }
  },
  plugins: [
    react({
      plugins: conditionalPlugins,
    }),
    tempo(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // @ts-ignore
    allowedHosts: true,
    hmr: {
      // Reduce HMR logs in console
      overlay: false,
      clientPort: 5173,
    },
    logger: {
      // Suppress server logs
      transports: []
    }
  }
});
