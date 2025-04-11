/**
 * Get the base URL for the application
 * @returns The base URL (with no trailing slash)
 */
export function getBaseUrl(): string {
  // Check for explicitly set base URL
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  // If no explicit URL set, construct based on current environment
  if (import.meta.env.MODE === 'production') {
    // Use window.location in production as fallback
    const loc = window.location;
    return `${loc.protocol}//${loc.host}`;
  }

  // Default for development
  return 'http://localhost:5173';
}

/**
 * Append query parameters to a URL
 * @param url Base URL
 * @param params Query parameters as an object
 * @returns URL with query parameters
 */
export function appendQueryParams(url: string, params: Record<string, string | number | boolean>): string {
  if (!url) return '';
  if (!params || Object.keys(params).length === 0) return url;
  
  const urlObj = new URL(url.includes('://') ? url : `http://example.com/${url}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.append(key, value.toString());
    }
  });
  
  // Remove the dummy origin if we added it
  if (!url.includes('://')) {
    return urlObj.pathname + urlObj.search + urlObj.hash;
  }
  
  return urlObj.toString();
}

/**
 * Safely encode a URI component
 * @param value Value to encode
 * @returns Encoded value
 */
export function safeEncodeURIComponent(value: string | number | boolean): string {
  if (value === undefined || value === null) return '';
  return encodeURIComponent(String(value));
} 