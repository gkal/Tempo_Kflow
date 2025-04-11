/**
 * Get the base URL of the application
 * @returns Base URL of the application
 */
export function getBaseUrl(): string {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  
  // Server-side or non-browser environment
  // Read from environment variables
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Fallback to a default based on environment
  if (process.env.NODE_ENV === 'production') {
    return 'https://yourdomain.com'; // Update this to your actual production domain
  } else {
    return 'http://localhost:3000'; // Default for development
  }
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