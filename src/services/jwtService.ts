/**
 * JWT Service
 * 
 * Handles JWT token generation, validation, and secure key management.
 * This service improves security by implementing proper JWT signing,
 * token rotation, and validation.
 */

import { supabase } from '@/lib/supabaseClient';
import * as jose from 'jose';
import { v4 as uuidv4 } from 'uuid';

// JWT configuration
const JWT_CONFIG = {
  ALGORITHM: 'ES256',      // ECDSA using P-256 curve and SHA-256
  TOKEN_EXPIRY: '1h',      // 1 hour
  REFRESH_EXPIRY: '30d',   // 30 days
  ISSUER: 'kflow-app',
  AUDIENCE: 'kflow-api',
  KEY_ROTATION_DAYS: 30,   // Generate new keys every 30 days
  KEY_CLEANUP_DAYS: 60     // Keep old keys for 60 days for validation
};

/**
 * JWT service for secure token generation and validation
 */
export class JwtService {
  /**
   * Get the current active JWT key pair
   * If no active key exists or current key is due for rotation, generate a new one
   */
  private static async getActiveKeyPair(): Promise<{
    keyId: string;
    privateKey: jose.KeyLike;
    publicKey: jose.KeyLike;
  }> {
    // Get the current active key
    const { data: activeKey, error } = await supabase
      .from('jwt_secrets')
      .select('id, key_id, public_key, private_key, created_at, expires_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If there's an error or no key found, or key is expired, generate a new key
    if (error || !activeKey || new Date(activeKey.expires_at) < new Date()) {
      return await this.generateNewKeyPair();
    }

    // Parse the keys
    const privateKey = await jose.importPKCS8(activeKey.private_key, JWT_CONFIG.ALGORITHM);
    const publicKey = await jose.importSPKI(activeKey.public_key, JWT_CONFIG.ALGORITHM);

    return {
      keyId: activeKey.key_id,
      privateKey,
      publicKey
    };
  }

  /**
   * Generate a new key pair for JWT signing
   */
  private static async generateNewKeyPair(): Promise<{
    keyId: string;
    privateKey: jose.KeyLike;
    publicKey: jose.KeyLike;
  }> {
    // Generate a new key pair
    const { privateKey, publicKey } = await jose.generateKeyPair(JWT_CONFIG.ALGORITHM);

    // Export the keys to PEM format
    const privatePem = await jose.exportPKCS8(privateKey);
    const publicPem = await jose.exportSPKI(publicKey);

    // Generate a key ID
    const keyId = uuidv4();

    // Calculate expiration (KEY_ROTATION_DAYS from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + JWT_CONFIG.KEY_ROTATION_DAYS);

    // Store the keys in the database
    const { error } = await supabase
      .from('jwt_secrets')
      .insert({
        key_id: keyId,
        private_key: privatePem,
        public_key: publicPem,
        expires_at: expirationDate.toISOString(),
        is_active: true
      });

    if (error) {
      console.error('Error storing JWT keys:', error);
      throw new Error('Failed to store JWT keys');
    }

    // Handle key rotation - mark older keys as inactive
    await this.rotateKeys();

    // Clean up old keys
    await this.cleanupOldKeys();

    return { keyId, privateKey, publicKey };
  }

  /**
   * Rotate keys by marking old keys as inactive
   */
  private static async rotateKeys(): Promise<void> {
    // Mark all keys except the newest as inactive
    const { error } = await supabase.rpc('mark_old_jwt_keys_inactive');

    if (error) {
      console.error('Error rotating JWT keys:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Clean up old keys that are past the cleanup threshold
   */
  private static async cleanupOldKeys(): Promise<void> {
    // Calculate cleanup threshold
    const cleanupThreshold = new Date();
    cleanupThreshold.setDate(cleanupThreshold.getDate() - JWT_CONFIG.KEY_CLEANUP_DAYS);

    // Delete keys older than the threshold
    const { error } = await supabase
      .from('jwt_secrets')
      .delete()
      .lt('created_at', cleanupThreshold.toISOString())
      .eq('is_active', false);

    if (error) {
      console.error('Error cleaning up old JWT keys:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Generate a JWT token for a user
   * 
   * @param userId User ID to include in the token
   * @param userRole User role to include in the token
   * @param customClaims Additional claims to include in the token
   * @returns The generated JWT token
   */
  public static async generateToken(
    userId: string,
    userRole: string,
    customClaims: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Get the active key pair
      const { keyId, privateKey } = await this.getActiveKeyPair();

      // Current time for token validation
      const now = Math.floor(Date.now() / 1000);

      // Prepare token payload
      const payload = {
        sub: userId,
        role: userRole,
        iss: JWT_CONFIG.ISSUER,
        aud: JWT_CONFIG.AUDIENCE,
        iat: now,
        nbf: now,
        jti: uuidv4(),
        ...customClaims
      };

      // Sign the token
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: JWT_CONFIG.ALGORITHM, kid: keyId })
        .setExpirationTime(JWT_CONFIG.TOKEN_EXPIRY)
        .sign(privateKey);

      return token;
    } catch (error) {
      console.error('Error generating JWT token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Generate a refresh token for a user
   * 
   * @param userId User ID to include in the token
   * @param sessionId Session ID to associate with the refresh token
   * @returns The generated refresh token
   */
  public static async generateRefreshToken(
    userId: string,
    sessionId: string
  ): Promise<string> {
    try {
      // Get the active key pair
      const { keyId, privateKey } = await this.getActiveKeyPair();

      // Current time for token validation
      const now = Math.floor(Date.now() / 1000);

      // Prepare token payload
      const payload = {
        sub: userId,
        session_id: sessionId,
        token_type: 'refresh',
        iss: JWT_CONFIG.ISSUER,
        aud: JWT_CONFIG.AUDIENCE,
        iat: now,
        nbf: now,
        jti: uuidv4()
      };

      // Sign the token
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: JWT_CONFIG.ALGORITHM, kid: keyId })
        .setExpirationTime(JWT_CONFIG.REFRESH_EXPIRY)
        .sign(privateKey);

      return token;
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify a JWT token
   * 
   * @param token Token to verify
   * @returns Decoded token payload if valid, null if invalid
   */
  public static async verifyToken(token: string): Promise<jose.JWTPayload | null> {
    try {
      // Extract key ID from token header
      const { kid } = jose.decodeProtectedHeader(token);

      if (!kid) {
        console.error('Token missing key ID in header');
        return null;
      }

      // Get the key from the database
      const { data: keyData, error } = await supabase
        .from('jwt_secrets')
        .select('public_key')
        .eq('key_id', kid)
        .single();

      if (error || !keyData) {
        console.error('Error retrieving JWT key:', error);
        return null;
      }

      // Import the public key
      const publicKey = await jose.importSPKI(keyData.public_key, JWT_CONFIG.ALGORITHM);

      // Verify the token
      const { payload } = await jose.jwtVerify(token, publicKey, {
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE,
      });

      return payload;
    } catch (error) {
      console.error('Error verifying JWT token:', error);
      return null;
    }
  }

  /**
   * Decode a JWT token without verifying (for debugging purposes)
   * 
   * @param token Token to decode
   * @returns Decoded token payload
   */
  public static decodeToken(token: string): jose.JWTPayload | null {
    try {
      // Extract the payload without verification
      const decoded = jose.decodeJwt(token);
      return decoded;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }
}

// Add RPC function to mark old keys as inactive (except newest one)
export const createJwtDatabaseFunctions = async () => {
  const { error } = await supabase.rpc('create_jwt_management_functions');
  
  if (error) {
    console.error('Error creating JWT management functions:', error);
  }
}; 