/**
 * Utility functions for security operations.
 * Provides functions for hashing data, generating secure tokens, and other security-related operations.
 */

/**
 * Hash data using a cryptographic hash function
 * In a browser environment, this uses SubtleCrypto when available
 * @param data The data to hash
 * @returns Promise resolving to the hashed value as a hex string
 */
export async function hashData(data: string | Record<string, any>): Promise<string> {
  try {
    // Convert object to string if needed
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Use SubtleCrypto if available (browser environment)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      
      // Convert hash buffer to hex string
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    // Fallback to basic hash function
    return simpleHash(dataString);
  } catch (error) {
    console.error('Error hashing data:', error);
    return simpleHash(typeof data === 'string' ? data : JSON.stringify(data));
  }
}

/**
 * Generate a simple non-cryptographic hash (for fallback only)
 * Do not use for security-critical applications
 * @param data String to hash
 * @returns Hash as a hex string
 */
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to 8-character hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate a secure random token
 * @param length Length of the token in bytes
 * @returns Secure random token as a hex string
 */
export function generateSecureToken(length = 32): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const buffer = new Uint8Array(length);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Fallback for non-browser environments or older browsers
  // This is less secure, so only use in non-critical applications
  let token = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length * 2; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
} 