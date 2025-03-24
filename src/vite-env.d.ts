/// <reference types="vite/client" />

/**
 * Type definitions for Vite's environment variables
 * This helps ensure type safety when using import.meta.env
 */
interface ImportMetaEnv {
  // Base environment variables
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  
  // Feature flags
  readonly VITE_TEMPO: string;
  
  // Environment-specific
  readonly BASE_URL: string;
  readonly MODE: 'development' | 'production' | 'staging';
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
