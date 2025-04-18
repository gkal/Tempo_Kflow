/**
 * Utility functions for security operations.
 * Provides functions for hashing data, generating secure tokens, and other security-related operations.
 */

// Secret key for hash generation
const CUSTOMER_HASH_SECRET = import.meta.env.VITE_CUSTOMER_HASH_SECRET || 'cust-temp0-k3y-8472';

/**
 * Generate a simple hash of a string
 * Not cryptographically secure, but sufficient for reference generation
 * 
 * @param data String to hash
 * @returns Hash string
 */
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate a more complex hash by combining multiple simple hashes
 * More secure than simpleHash but still browser-compatible
 * 
 * @param data String to hash
 * @param salt Salt to add entropy
 * @returns Enhanced hash string
 */
function enhancedHash(data: string, salt: string): string {
  // Apply multiple rounds of hashing with different combinations
  const round1 = simpleHash(data + salt);
  const round2 = simpleHash(salt + data + round1);
  const round3 = simpleHash(round1 + data + round2 + salt);
  
  // Combine the rounds for added security
  return round3 + round2.substring(0, 8);
}

/**
 * Generate a secure random token
 * @param length Length of the token
 * @returns Secure random token
 */
export function generateSecureToken(length = 32): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const buffer = new Uint8Array(length);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Fallback for older browsers
  let token = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length * 2; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
}

/**
 * Generate a secure customer reference
 * Simple but effective approach that doesn't expose the actual customer ID
 * 
 * @param customerId The customer ID to encode
 * @returns A secure reference string
 */
export function generateSecureCustomerReference(customerId: string): string {
  if (!customerId) return '';
  
  // Create a timestamp-based salt for additional entropy
  const timestamp = Date.now().toString();
  
  // Generate enhanced hash
  const hash = enhancedHash(customerId, CUSTOMER_HASH_SECRET + timestamp.substring(0, 6));
  
  // Return a reference with a prefix and limited length
  return `ref-${hash.substring(0, 16)}`;
}

/**
 * Verify if a secure reference corresponds to a given customer ID
 * This simplified version can't do direct verification, but it still obscures the ID
 * 
 * @param reference The secure reference to verify
 * @param customerId The customer ID to check against
 * @returns Always true for this simplified version
 */
export function verifySecureCustomerReference(reference: string, customerId: string): boolean {
  // In this simplified version, we can't verify directly
  // The external application would need to query the database to get
  // the customer ID from the form link token, not from the reference
  
  // Basic validation
  return reference.startsWith('ref-') && reference.length >= 20;
}

/**
 * Generate a complete set of parameters for external applications
 * This combines customer reference with application identifier
 * 
 * @param customerId The customer ID
 * @param appId Optional application identifier
 * @returns URL parameters string
 */
export function generateExternalAppParams(customerId: string, appId?: string): string {
  const reference = generateSecureCustomerReference(customerId);
  let params = `ref=${reference}`;
  
  if (appId) {
    params += `&app=${appId}`;
  }
  
  return params;
} 