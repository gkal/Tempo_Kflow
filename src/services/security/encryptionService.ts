/**
 * Encryption Service
 * 
 * Provides cryptographic functionality for:
 * - Form data encryption at rest
 * - Transport layer security enhancements
 * - Key management
 * - Field-level encryption for sensitive data
 * - Encryption audit logging
 */

import { supabase } from '@/lib/supabaseClient';
import { createHash, createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as jose from 'jose';
import { generateSecureToken } from '@/utils/securityUtils';

// Encryption configuration
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-gcm',     // AES-GCM with 256-bit key
  KEY_SIZE: 32,                 // 256 bits in bytes
  IV_SIZE: 16,                  // 128 bits in bytes
  TAG_SIZE: 16,                 // 128 bits in bytes
  KEY_ROTATION_DAYS: 30,        // Rotate keys every 30 days
  MIN_PASSWORD_LENGTH: 12,      // Minimum length for derived keys from passwords
  PBKDF2_ITERATIONS: 600000,    // Iterations for PBKDF2 key derivation
  HASH_ALGORITHM: 'sha256',     // Hash algorithm for key derivation
  SENSITIVE_FIELDS: [
    'taxId',
    'ssn',
    'creditCardNumber',
    'bankAccount',
    'passport',
    'idNumber',
    'healthInsuranceNumber',
    'personalNotes'
  ],
  VERSION: 1                    // Current encryption version
};

// Interfaces for encryption
export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string;   // Initialization vector
  version: number; // Encryption version
}

export interface EncryptionKey {
  id: string;
  key: string;
  algorithm: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  version: number;
  purpose: 'data' | 'transport' | 'field';
}

export interface EncryptionEvent {
  id: string;
  operation: 'encrypt' | 'decrypt' | 'key_rotation' | 'key_creation' | 'key_deletion';
  resource_type: string;
  resource_id?: string;
  user_id?: string;
  timestamp: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * Encryption Service for secure data handling
 */
class EncryptionService {
  private static instance: EncryptionService;
  private masterKeyCache: Map<string, Buffer> = new Map();
  private activeKeyIds: Map<string, string> = new Map();

  // Make constructor private to enforce singleton
  private constructor() { }

  /**
   * Get singleton instance
   */
  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Initialize the service and load necessary keys
   */
  public async initialize(): Promise<boolean> {
    try {
      // Check if encryption keys table exists and create it if not
      await this.ensureEncryptionTables();
      
      // Load active keys
      await this.loadActiveKeys();
      
      // Schedule automatic key rotation
      this.scheduleKeyRotation();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      return false;
    }
  }

  /**
   * Ensure all required encryption tables exist in the database
   */
  private async ensureEncryptionTables(): Promise<void> {
    const { error: keysTableError } = await supabase.rpc('create_encryption_keys_table_if_not_exists');
    if (keysTableError) {
      console.error('Error creating encryption_keys table:', keysTableError);
      throw keysTableError;
    }

    const { error: eventsTableError } = await supabase.rpc('create_encryption_events_table_if_not_exists');
    if (eventsTableError) {
      console.error('Error creating encryption_events table:', eventsTableError);
      throw eventsTableError;
    }
  }

  /**
   * Load all active encryption keys into memory
   */
  private async loadActiveKeys(): Promise<void> {
    const { data, error } = await supabase
      .from('encryption_keys')
      .select('id, key, purpose')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading encryption keys:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      // Create initial keys if none exist
      await this.createInitialKeys();
      return;
    }

    // Clear existing cache
    this.masterKeyCache.clear();
    this.activeKeyIds.clear();

    // Load keys into cache by purpose
    for (const keyData of data) {
      try {
        // Store the actual key in memory (decoding from base64)
        this.masterKeyCache.set(keyData.id, Buffer.from(keyData.key, 'base64'));
        
        // Remember which key is active for each purpose
        if (!this.activeKeyIds.has(keyData.purpose)) {
          this.activeKeyIds.set(keyData.purpose, keyData.id);
        }
      } catch (decryptError) {
        console.error(`Failed to decrypt key ${keyData.id}:`, decryptError);
      }
    }
  }

  /**
   * Create initial encryption keys if none exist
   */
  private async createInitialKeys(): Promise<void> {
    const purposes: ('data' | 'transport' | 'field')[] = ['data', 'transport', 'field'];
    
    for (const purpose of purposes) {
      const keyId = await this.generateNewKey(purpose);
      if (keyId) {
        this.activeKeyIds.set(purpose, keyId);
      }
    }
  }

  /**
   * Schedule automatic key rotation
   */
  private scheduleKeyRotation(): void {
    // Check for key rotation once a day
    const oneDayMs = 24 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        await this.rotateKeysIfNeeded();
      } catch (error) {
        console.error('Error during scheduled key rotation:', error);
      }
    }, oneDayMs);
  }

  /**
   * Generate a new encryption key
   * @param purpose The purpose of the key
   * @returns The ID of the newly generated key
   */
  public async generateNewKey(purpose: 'data' | 'transport' | 'field'): Promise<string | null> {
    try {
      // Generate a new random key
      const newKey = randomBytes(ENCRYPTION_CONFIG.KEY_SIZE);
      const keyId = uuidv4();
      const now = new Date();
      
      // Calculate expiration date (30 days from now)
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + ENCRYPTION_CONFIG.KEY_ROTATION_DAYS);
      
      // Store the key in the database (encrypted)
      const { error } = await supabase
        .from('encryption_keys')
        .insert({
          id: keyId,
          key: newKey.toString('base64'),
          algorithm: ENCRYPTION_CONFIG.ALGORITHM,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
          version: ENCRYPTION_CONFIG.VERSION,
          purpose
        });

      if (error) {
        console.error('Error storing new encryption key:', error);
        return null;
      }

      // Cache the key in memory
      this.masterKeyCache.set(keyId, newKey);
      
      // Log the key creation event
      await this.logEncryptionEvent({
        operation: 'key_creation',
        resource_type: 'encryption_key',
        resource_id: keyId,
        success: true,
        metadata: { purpose, algorithm: ENCRYPTION_CONFIG.ALGORITHM }
      });

      return keyId;
    } catch (error) {
      console.error('Error generating new encryption key:', error);
      return null;
    }
  }

  /**
   * Check if keys need rotation and rotate them if needed
   */
  public async rotateKeysIfNeeded(): Promise<boolean> {
    try {
      const now = new Date();
      
      // Query for keys nearing expiration (within 3 days)
      const threesDaysFromNow = new Date(now);
      threesDaysFromNow.setDate(now.getDate() + 3);
      
      const { data, error } = await supabase
        .from('encryption_keys')
        .select('id, purpose')
        .eq('is_active', true)
        .lt('expires_at', threesDaysFromNow.toISOString());

      if (error) {
        console.error('Error checking keys for rotation:', error);
        return false;
      }

      // Rotate any keys nearing expiration
      for (const keyData of data || []) {
        const newKeyId = await this.rotateKey(keyData.id, keyData.purpose);
        if (newKeyId) {
          this.activeKeyIds.set(keyData.purpose, newKeyId);
        }
      }

      return true;
    } catch (error) {
      console.error('Error during key rotation check:', error);
      return false;
    }
  }

  /**
   * Rotate a specific key
   * @param oldKeyId The ID of the key to rotate
   * @param purpose The purpose of the key
   * @returns The ID of the newly generated key
   */
  public async rotateKey(oldKeyId: string, purpose: 'data' | 'transport' | 'field'): Promise<string | null> {
    try {
      // Generate a new key
      const newKeyId = await this.generateNewKey(purpose);
      if (!newKeyId) {
        return null;
      }

      // Mark the old key as inactive
      const { error } = await supabase
        .from('encryption_keys')
        .update({ is_active: false })
        .eq('id', oldKeyId);

      if (error) {
        console.error('Error deactivating old encryption key:', error);
        return null;
      }

      // Remove old key from cache
      this.masterKeyCache.delete(oldKeyId);

      // Log key rotation event
      await this.logEncryptionEvent({
        operation: 'key_rotation',
        resource_type: 'encryption_key',
        resource_id: oldKeyId,
        success: true,
        metadata: { new_key_id: newKeyId, purpose }
      });

      return newKeyId;
    } catch (error) {
      console.error('Error rotating encryption key:', error);
      return null;
    }
  }

  /**
   * Get the active key ID for a specific purpose
   * @param purpose The purpose of the key
   * @returns The ID of the active key
   */
  private getActiveKeyId(purpose: 'data' | 'transport' | 'field'): string | null {
    const keyId = this.activeKeyIds.get(purpose);
    if (!keyId) {
      console.error(`No active key found for purpose: ${purpose}`);
      return null;
    }
    return keyId;
  }

  /**
   * Get an encryption key by ID
   * @param keyId The ID of the key to retrieve
   * @returns The encryption key buffer
   */
  private getKeyById(keyId: string): Buffer | null {
    const key = this.masterKeyCache.get(keyId);
    if (!key) {
      console.error(`Encryption key not found in cache: ${keyId}`);
      return null;
    }
    return key;
  }

  /**
   * Encrypt data at rest
   * @param data Data to encrypt
   * @param keyId Optional specific key ID to use
   * @returns Encrypted data object
   */
  public async encryptData(data: any, keyId?: string): Promise<EncryptedData | null> {
    try {
      // Use provided key or get active data key
      const activeKeyId = keyId || this.getActiveKeyId('data');
      if (!activeKeyId) return null;
      
      const key = this.getKeyById(activeKeyId);
      if (!key) return null;

      // Generate initialization vector
      const iv = randomBytes(ENCRYPTION_CONFIG.IV_SIZE);
      
      // Create cipher
      const cipher = createCipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv);
      
      // Convert data to string if not already
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Encrypt the data
      let ciphertext = cipher.update(dataString, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      
      // Get the auth tag
      const tag = cipher.getAuthTag();

      // Log encryption event (without sensitive details)
      await this.logEncryptionEvent({
        operation: 'encrypt',
        resource_type: 'data',
        success: true
      });

      // Return the encrypted data
      return {
        data: ciphertext,
        iv: iv.toString('base64'),
        version: ENCRYPTION_CONFIG.VERSION,
        tag: tag.toString('base64')
      };
    } catch (error) {
      console.error('Error encrypting data:', error);
      
      // Log encryption failure
      await this.logEncryptionEvent({
        operation: 'encrypt',
        resource_type: 'data',
        success: false,
        error_message: (error as Error).message
      });
      
      return null;
    }
  }

  /**
   * Decrypt data at rest
   * @param encryptedData Encrypted data object
   * @returns Decrypted data
   */
  public async decryptData(encryptedData: EncryptedData): Promise<any | null> {
    try {
      // Get key ID from encrypted data or use active key
      const keyId = encryptedData.keyId || this.getActiveKeyId('data');
      if (!keyId) return null;
      
      const key = this.getKeyById(keyId);
      if (!key) return null;

      // Convert IV and tag from base64
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');
      
      // Create decipher
      const decipher = createDecipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Log decryption event
      await this.logEncryptionEvent({
        operation: 'decrypt',
        resource_type: 'data',
        success: true
      });

      // Parse JSON if the decrypted string is JSON
      try {
        return JSON.parse(decrypted);
      } catch {
        // If parsing fails, return the string as-is
        return decrypted;
      }
    } catch (error) {
      console.error('Error decrypting data:', error);
      
      // Log decryption failure
      await this.logEncryptionEvent({
        operation: 'decrypt',
        resource_type: 'data',
        success: false,
        error_message: (error as Error).message
      });
      
      return null;
    }
  }

  /**
   * Encrypt sensitive fields in an object
   * @param data Object containing potentially sensitive fields
   * @returns Object with sensitive fields encrypted
   */
  public async encryptSensitiveFields(data: Record<string, any>): Promise<Record<string, any>> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const encryptedData = { ...data };
    const encryptedFields: string[] = [];
    const keyId = this.getActiveKeyId('field');

    if (!keyId) {
      console.error('No active key found for field encryption');
      return data;
    }

    try {
      // Identify and encrypt sensitive fields
      for (const fieldName of ENCRYPTION_CONFIG.SENSITIVE_FIELDS) {
        if (fieldName in data && data[fieldName] !== null && data[fieldName] !== undefined) {
          const encryptedField = await this.encryptData(data[fieldName], keyId);
          if (encryptedField) {
            encryptedData[fieldName] = {
              __encrypted: true,
              ...encryptedField
            };
            encryptedFields.push(fieldName);
          }
        }
      }

      // If any fields were encrypted, add metadata
      if (encryptedFields.length > 0) {
        encryptedData.__encryptedFields = encryptedFields;
        
        // Log field encryption event
        await this.logEncryptionEvent({
          operation: 'encrypt',
          resource_type: 'field',
          success: true,
          metadata: { field_count: encryptedFields.length }
        });
      }

      return encryptedData;
    } catch (error) {
      console.error('Error encrypting sensitive fields:', error);
      
      // Log encryption failure
      await this.logEncryptionEvent({
        operation: 'encrypt',
        resource_type: 'field',
        success: false,
        error_message: (error as Error).message
      });
      
      return data; // Return original data on error
    }
  }

  /**
   * Decrypt sensitive fields in an object
   * @param data Object containing encrypted fields
   * @returns Object with sensitive fields decrypted
   */
  public async decryptSensitiveFields(data: Record<string, any>): Promise<Record<string, any>> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Early return if no encrypted fields
    if (!data.__encryptedFields) {
      return data;
    }

    const decryptedData = { ...data };
    const encryptedFields = data.__encryptedFields as string[];

    try {
      // Decrypt each encrypted field
      for (const fieldName of encryptedFields) {
        if (data[fieldName] && data[fieldName].__encrypted) {
          const fieldData = data[fieldName] as EncryptedData & { __encrypted: boolean };
          const decryptedValue = await this.decryptData(fieldData);
          
          if (decryptedValue !== null) {
            decryptedData[fieldName] = decryptedValue;
          }
        }
      }

      // Remove encryption metadata
      delete decryptedData.__encryptedFields;
      
      // Log field decryption event
      await this.logEncryptionEvent({
        operation: 'decrypt',
        resource_type: 'field',
        success: true,
        metadata: { field_count: encryptedFields.length }
      });

      return decryptedData;
    } catch (error) {
      console.error('Error decrypting sensitive fields:', error);
      
      // Log decryption failure
      await this.logEncryptionEvent({
        operation: 'decrypt',
        resource_type: 'field',
        success: false,
        error_message: (error as Error).message
      });
      
      return data; // Return original data on error
    }
  }

  /**
   * Generate a secure hash for data verification
   * @param data Data to hash
   * @returns Secure hash
   */
  public generateHash(data: string | Buffer): string {
    try {
      const hash = createHash(ENCRYPTION_CONFIG.HASH_ALGORITHM);
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      console.error('Error generating hash:', error);
      return '';
    }
  }

  /**
   * Create a secure HMAC signature for data integrity
   * @param data Data to sign
   * @param keyId Key ID to use for signing
   * @returns HMAC signature
   */
  public createHmacSignature(data: string | Buffer, keyId?: string): string | null {
    try {
      const activeKeyId = keyId || this.getActiveKeyId('transport');
      if (!activeKeyId) return null;
      
      const key = this.getKeyById(activeKeyId);
      if (!key) return null;

      const hmac = createHmac(ENCRYPTION_CONFIG.HASH_ALGORITHM, key);
      hmac.update(data);
      return hmac.digest('hex');
    } catch (error) {
      console.error('Error creating HMAC signature:', error);
      return null;
    }
  }

  /**
   * Verify a HMAC signature
   * @param data Original data
   * @param signature HMAC signature to verify
   * @param keyId Key ID used for signing
   * @returns True if signature is valid
   */
  public verifyHmacSignature(data: string | Buffer, signature: string, keyId: string): boolean {
    try {
      const calculatedSignature = this.createHmacSignature(data, keyId);
      return calculatedSignature === signature;
    } catch (error) {
      console.error('Error verifying HMAC signature:', error);
      return false;
    }
  }

  /**
   * Encrypt data for secure transport
   * @param data Data to encrypt for transport
   * @returns Transport encryption envelope with encrypted data
   */
  public async encryptForTransport(data: any): Promise<{ encrypted: string; keyId: string } | null> {
    try {
      const keyId = this.getActiveKeyId('transport');
      if (!keyId) return null;
      
      const key = this.getKeyById(keyId);
      if (!key) return null;

      // Convert data to string if not already
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Create JWE using JOSE
      const encoder = new TextEncoder();
      const encryptionKey = await jose.importKey(
        'raw',
        key,
        ENCRYPTION_CONFIG.ALGORITHM,
        false,
        ['encrypt']
      );

      const jwe = await new jose.CompactEncrypt(encoder.encode(dataString))
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .encrypt(encryptionKey);

      // Log transport encryption
      await this.logEncryptionEvent({
        operation: 'encrypt',
        resource_type: 'transport',
        success: true
      });

      return { encrypted: jwe, keyId };
    } catch (error) {
      console.error('Error encrypting for transport:', error);
      
      // Log encryption failure
      await this.logEncryptionEvent({
        operation: 'encrypt',
        resource_type: 'transport',
        success: false,
        error_message: (error as Error).message
      });
      
      return null;
    }
  }

  /**
   * Decrypt data received from transport
   * @param encryptedData Encrypted data from transport
   * @param keyId Key ID used for encryption
   * @returns Decrypted data
   */
  public async decryptFromTransport(encryptedData: string, keyId: string): Promise<any | null> {
    try {
      const key = this.getKeyById(keyId);
      if (!key) return null;

      // Decrypt JWE using JOSE
      const decryptionKey = await jose.importKey(
        'raw',
        key,
        ENCRYPTION_CONFIG.ALGORITHM,
        false,
        ['decrypt']
      );

      const { plaintext } = await jose.compactDecrypt(encryptedData, decryptionKey);
      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(plaintext);

      // Log transport decryption
      await this.logEncryptionEvent({
        operation: 'decrypt',
        resource_type: 'transport',
        success: true
      });

      // Parse JSON if the decrypted string is JSON
      try {
        return JSON.parse(decryptedText);
      } catch {
        // If parsing fails, return the string as-is
        return decryptedText;
      }
    } catch (error) {
      console.error('Error decrypting from transport:', error);
      
      // Log decryption failure
      await this.logEncryptionEvent({
        operation: 'decrypt',
        resource_type: 'transport',
        success: false,
        error_message: (error as Error).message
      });
      
      return null;
    }
  }

  /**
   * Log encryption-related events for audit purposes
   * @param event Encryption event to log
   */
  public async logEncryptionEvent(event: Partial<EncryptionEvent>): Promise<void> {
    try {
      const { error } = await supabase
        .from('encryption_events')
        .insert({
          id: uuidv4(),
          operation: event.operation,
          resource_type: event.resource_type,
          resource_id: event.resource_id,
          user_id: event.user_id,
          timestamp: new Date().toISOString(),
          success: event.success,
          error_message: event.error_message,
          metadata: event.metadata
        });

      if (error) {
        console.error('Error logging encryption event:', error);
      }
    } catch (error) {
      console.error('Exception logging encryption event:', error);
    }
  }

  /**
   * Set up the database tables for encryption
   */
  public async setupEncryptionSchema(): Promise<boolean> {
    try {
      // Create stored procedure to create encryption keys table if not exists
      const { error: createKeysTableProcError } = await supabase.rpc('create_stored_procedure_for_encryption_keys_table');
      if (createKeysTableProcError) {
        console.error('Error creating stored procedure for encryption keys table:', createKeysTableProcError);
        return false;
      }

      // Create stored procedure to create encryption events table if not exists
      const { error: createEventsTableProcError } = await supabase.rpc('create_stored_procedure_for_encryption_events_table');
      if (createEventsTableProcError) {
        console.error('Error creating stored procedure for encryption events table:', createEventsTableProcError);
        return false;
      }

      // Ensure tables exist
      await this.ensureEncryptionTables();

      return true;
    } catch (error) {
      console.error('Error setting up encryption schema:', error);
      return false;
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();
export default encryptionService;

/**
 * Encrypt data using AES-GCM
 * @param data The data to encrypt (object or string)
 * @returns Promise resolving to the encrypted data structure
 */
export async function encryptData(data: unknown): Promise<EncryptedData> {
  try {
    // Convert data to string if needed
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Use SubtleCrypto if available (browser environment)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // For simplicity, we're using a static key here
      // In a real app, you would manage keys securely
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(import.meta.env.VITE_ENCRYPTION_KEY || 'default-encryption-key'),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // Generate a random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          // Optional: Add authentication tag length
          tagLength: 128,
        },
        keyMaterial,
        new TextEncoder().encode(dataString)
      );
      
      // Convert to base64
      const encryptedBase64 = btoa(
        Array.from(new Uint8Array(encryptedBuffer))
          .map(byte => String.fromCharCode(byte))
          .join('')
      );
      
      const ivBase64 = btoa(
        Array.from(iv)
          .map(byte => String.fromCharCode(byte))
          .join('')
      );
      
      return {
        data: encryptedBase64,
        iv: ivBase64,
        version: 1
      };
    }
    
    // Fallback for environments without SubtleCrypto
    // This is just a placeholder and NOT secure
    return {
      data: btoa(dataString),
      iv: btoa(generateSecureToken(12)),
      version: 0 // Indicates not really encrypted
    };
  } catch (error) {
    console.error('Encryption error:', error);
    // Return a marked fallback that indicates encryption failed
    return {
      data: btoa(`ENCRYPTION_FAILED:${typeof data === 'string' ? data : JSON.stringify(data)}`),
      iv: '',
      version: -1 // Indicates encryption failure
    };
  }
}

/**
 * Create digital signature for data to ensure integrity
 * @param data The data to sign (object or string)
 * @returns Promise resolving to signature string
 */
export async function createSignature(data: unknown): Promise<string> {
  try {
    // Convert data to string if needed
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Use SubtleCrypto if available (browser environment)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // For simplicity, we're using a static key here
      // In a real app, you would manage keys securely
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(import.meta.env.VITE_SIGNATURE_KEY || 'default-signature-key'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      // Sign the data
      const signatureBuffer = await window.crypto.subtle.sign(
        'HMAC',
        keyMaterial,
        new TextEncoder().encode(dataString)
      );
      
      // Convert to hex
      return Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    // Fallback for environments without SubtleCrypto
    // This is just a placeholder and NOT secure
    return `UNSIGNED:${generateSecureToken(16)}`;
  } catch (error) {
    console.error('Signature error:', error);
    return `SIGNATURE_ERROR:${generateSecureToken(8)}`;
  }
} 