/**
 * Field Encryption Service
 * 
 * Provides field-level encryption for sensitive data fields in forms and customer data.
 * - Selective field encryption
 * - Transparent encryption/decryption
 * - Type preservation
 * - Search-preserving encryption
 */

import { encryptionService, ENCRYPTION_CONFIG } from './encryptionService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for sensitive field detection and encryption
 */
export const FIELD_ENCRYPTION_CONFIG = {
  // Fields that should always be encrypted
  ALWAYS_ENCRYPT: [
    ...ENCRYPTION_CONFIG.SENSITIVE_FIELDS,
    'healthcareData',
    'financialData'
  ],
  
  // Patterns to detect sensitive fields by name
  SENSITIVE_PATTERNS: [
    /social.*security/i,
    /tax.*id/i,
    /credit.*card/i,
    /card.*number/i,
    /passport/i,
    /^ssn$/i,
    /password/i,
    /secret/i,
    /token/i,
    /health.*insurance/i,
    /bank.*account/i,
    /routing.*number/i,
    /account.*number/i,
    /security.*question/i,
    /security.*answer/i
  ],
  
  // Regular expressions for common sensitive data formats
  DATA_PATTERNS: {
    CREDIT_CARD: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})$/,
    SSN: /^(?!000|666|9\d{2})([0-8]\d{2}|7([0-6]\d|7[012]))([-]?)(?!00)\d\d\2(?!0000)\d{4}$/,
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^\+?[1-9]\d{1,14}$/
  },
  
  // Don't encrypt these fields even if they match patterns
  EXCLUDED_FIELDS: [
    'email',
    'phone',
    'address',
    'name',
    'firstName',
    'lastName',
    'companyName',
    'city',
    'country',
    'state',
    'postalCode',
    'zipCode'
  ]
};

/**
 * Type for encrypted field data including metadata
 */
export interface EncryptedField {
  __encrypted: true;
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
  keyId: string;
  type: string; // Original data type
  prefix?: string; // Optional prefix for searchable encryption
  format?: string; // Format information (e.g., "credit-card", "ssn")
}

/**
 * Field Encryption Service for form and entity data protection
 */
class FieldEncryptionService {
  private static instance: FieldEncryptionService;
  
  // Make constructor private to enforce singleton
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): FieldEncryptionService {
    if (!FieldEncryptionService.instance) {
      FieldEncryptionService.instance = new FieldEncryptionService();
    }
    return FieldEncryptionService.instance;
  }
  
  /**
   * Initialize the field encryption service
   */
  public async initialize(): Promise<boolean> {
    try {
      // Initialize encryption service if not already initialized
      await encryptionService.initialize();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize field encryption service:', error);
      return false;
    }
  }
  
  /**
   * Determine if a field should be encrypted based on name and value
   * @param fieldName The name of the field
   * @param fieldValue The value of the field
   * @returns True if the field should be encrypted
   */
  public shouldEncryptField(fieldName: string, fieldValue: any): boolean {
    // Skip encryption for null or undefined values
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    
    // Always encrypt fields in the ALWAYS_ENCRYPT list
    if (FIELD_ENCRYPTION_CONFIG.ALWAYS_ENCRYPT.includes(fieldName)) {
      return true;
    }
    
    // Never encrypt fields in the EXCLUDED_FIELDS list
    if (FIELD_ENCRYPTION_CONFIG.EXCLUDED_FIELDS.includes(fieldName)) {
      return false;
    }
    
    // Check if field name matches sensitive patterns
    const nameMatches = FIELD_ENCRYPTION_CONFIG.SENSITIVE_PATTERNS.some(pattern => 
      pattern.test(fieldName)
    );
    
    if (nameMatches) {
      return true;
    }
    
    // Check if field value matches sensitive data patterns
    if (typeof fieldValue === 'string') {
      const valueIsSensitive = (
        FIELD_ENCRYPTION_CONFIG.DATA_PATTERNS.CREDIT_CARD.test(fieldValue) ||
        FIELD_ENCRYPTION_CONFIG.DATA_PATTERNS.SSN.test(fieldValue)
      );
      
      if (valueIsSensitive) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Detect the format of sensitive data
   * @param value The sensitive data value
   * @returns The format identifier or undefined
   */
  private detectDataFormat(value: any): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    
    if (FIELD_ENCRYPTION_CONFIG.DATA_PATTERNS.CREDIT_CARD.test(value)) {
      return 'credit-card';
    }
    
    if (FIELD_ENCRYPTION_CONFIG.DATA_PATTERNS.SSN.test(value)) {
      return 'ssn';
    }
    
    if (FIELD_ENCRYPTION_CONFIG.DATA_PATTERNS.EMAIL.test(value)) {
      return 'email';
    }
    
    if (FIELD_ENCRYPTION_CONFIG.DATA_PATTERNS.PHONE.test(value)) {
      return 'phone';
    }
    
    return undefined;
  }
  
  /**
   * Create a searchable prefix for sensitive data
   * @param value The sensitive data value
   * @param format The detected format of the data
   * @returns A prefix string for searchable encryption
   */
  private createSearchablePrefix(value: any, format?: string): string | undefined {
    if (typeof value !== 'string' || value.length < 4) {
      return undefined;
    }
    
    switch (format) {
      case 'credit-card':
        // Last four digits of credit card
        return value.slice(-4);
        
      case 'ssn':
        // Last four digits of SSN
        return value.replace(/[^0-9]/g, '').slice(-4);
        
      case 'phone':
        // Last four digits of phone number
        return value.replace(/[^0-9]/g, '').slice(-4);
        
      case 'email':
        // First two characters of email
        return value.slice(0, 2).toLowerCase();
        
      default:
        if (value.length >= 4) {
          // First character as a simple prefix
          return value.slice(0, 1).toLowerCase();
        }
        return undefined;
    }
  }
  
  /**
   * Encrypt a single field value
   * @param fieldValue The value to encrypt
   * @returns The encrypted field data
   */
  public async encryptField(fieldValue: any): Promise<EncryptedField | null> {
    try {
      // Get the type of the field value
      const type = typeof fieldValue;
      const format = this.detectDataFormat(fieldValue);
      const prefix = this.createSearchablePrefix(fieldValue, format);
      
      // Convert non-string values to strings
      const valueToEncrypt = type === 'string' 
        ? fieldValue 
        : JSON.stringify(fieldValue);
      
      // Encrypt the value
      const encrypted = await encryptionService.encryptData(valueToEncrypt);
      if (!encrypted) {
        return null;
      }
      
      // Create encrypted field structure
      return {
        __encrypted: true,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        version: encrypted.version,
        keyId: encrypted.keyId!,
        type,
        prefix,
        format
      };
    } catch (error) {
      console.error('Error encrypting field:', error);
      return null;
    }
  }
  
  /**
   * Decrypt a single encrypted field
   * @param encryptedField The encrypted field data
   * @returns The decrypted field value
   */
  public async decryptField(encryptedField: EncryptedField): Promise<any | null> {
    try {
      // Extract encryption data
      const { ciphertext, iv, tag, version, keyId, type } = encryptedField;
      
      // Create encrypted data object for decryption
      const encryptedData = {
        ciphertext,
        iv,
        tag,
        version,
        keyId
      };
      
      // Decrypt the data
      const decrypted = await encryptionService.decryptData(encryptedData);
      if (decrypted === null) {
        return null;
      }
      
      // Convert back to original type if needed
      if (type === 'number') {
        return Number(decrypted);
      } else if (type === 'boolean') {
        return decrypted === 'true';
      } else if (type === 'object') {
        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted;
        }
      }
      
      // Return as string for string type
      return decrypted;
    } catch (error) {
      console.error('Error decrypting field:', error);
      return null;
    }
  }
  
  /**
   * Process an object to encrypt sensitive fields
   * @param data The object containing potentially sensitive fields
   * @returns A new object with sensitive fields encrypted
   */
  public async encryptFields(data: Record<string, any>): Promise<Record<string, any>> {
    // Skip empty or non-object data
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }
    
    const result: Record<string, any> = {};
    const encryptedFields: string[] = [];
    
    // Process each field
    for (const [key, value] of Object.entries(data)) {
      // Recursively process nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !value.__encrypted) {
        result[key] = await this.encryptFields(value);
        continue;
      }
      
      // Recursively process arrays
      if (Array.isArray(value)) {
        result[key] = await Promise.all(
          value.map(async item => 
            item && typeof item === 'object'
              ? await this.encryptFields(item)
              : item
          )
        );
        continue;
      }
      
      // Handle regular fields
      if (this.shouldEncryptField(key, value)) {
        const encryptedValue = await this.encryptField(value);
        if (encryptedValue) {
          result[key] = encryptedValue;
          encryptedFields.push(key);
        } else {
          // Fall back to original value if encryption fails
          result[key] = value;
        }
      } else {
        // Keep unencrypted fields as is
        result[key] = value;
      }
    }
    
    // Add metadata about encrypted fields if any were encrypted
    if (encryptedFields.length > 0) {
      result.__encryptedFields = encryptedFields;
    }
    
    return result;
  }
  
  /**
   * Process an object to decrypt encrypted fields
   * @param data The object containing encrypted fields
   * @returns A new object with encrypted fields decrypted
   */
  public async decryptFields(data: Record<string, any>): Promise<Record<string, any>> {
    // Skip empty or non-object data
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }
    
    const result: Record<string, any> = {};
    
    // Early return if no encrypted fields metadata
    const encryptedFields = data.__encryptedFields as string[] | undefined;
    
    // Process each field
    for (const [key, value] of Object.entries(data)) {
      // Skip metadata field
      if (key === '__encryptedFields') {
        continue;
      }
      
      // Recursively process nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !value.__encrypted) {
        result[key] = await this.decryptFields(value);
        continue;
      }
      
      // Recursively process arrays
      if (Array.isArray(value)) {
        result[key] = await Promise.all(
          value.map(async item => 
            item && typeof item === 'object'
              ? await this.decryptFields(item)
              : item
          )
        );
        continue;
      }
      
      // Handle encrypted fields
      if (value && typeof value === 'object' && value.__encrypted) {
        const decryptedValue = await this.decryptField(value as EncryptedField);
        result[key] = decryptedValue !== null ? decryptedValue : value;
      } else {
        // Keep unencrypted fields as is
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Search through encrypted fields using prefixes
   * @param data Object containing encrypted fields
   * @param searchTerm Term to search for
   * @returns Fields that match the search term
   */
  public async searchEncryptedFields(
    data: Record<string, any>,
    searchTerm: string
  ): Promise<Record<string, any>> {
    // Skip empty or non-object data
    if (!data || typeof data !== 'object' || !searchTerm) {
      return {};
    }
    
    const results: Record<string, any> = {};
    
    // Process each field
    for (const [key, value] of Object.entries(data)) {
      // Recursively search nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !value.__encrypted) {
        const nestedResults = await this.searchEncryptedFields(value, searchTerm);
        if (Object.keys(nestedResults).length > 0) {
          results[key] = nestedResults;
        }
        continue;
      }
      
      // Recursively search arrays
      if (Array.isArray(value)) {
        const arrayResults = await Promise.all(
          value.map(async (item, index) => {
            if (item && typeof item === 'object') {
              const itemResults = await this.searchEncryptedFields(item, searchTerm);
              return { index, results: itemResults };
            }
            return { index, results: {} };
          })
        );
        
        const nonEmptyResults = arrayResults.filter(item => 
          Object.keys(item.results).length > 0
        );
        
        if (nonEmptyResults.length > 0) {
          results[key] = nonEmptyResults.map(item => ({
            index: item.index,
            matches: item.results
          }));
        }
        continue;
      }
      
      // Check if this is an encrypted field with a prefix
      if (value && typeof value === 'object' && value.__encrypted && value.prefix) {
        // Check if the search term starts with the prefix
        if (searchTerm.toLowerCase().startsWith(value.prefix.toLowerCase())) {
          // This might be a match, so include it in results
          results[key] = {
            possibleMatch: true,
            prefix: value.prefix,
            format: value.format
          };
        }
      }
    }
    
    return results;
  }
  
  /**
   * Create a report on sensitive data usage in a dataset
   * @param data The data to analyze
   * @returns A report of sensitive data usage
   */
  public async analyzeSensitiveDataUsage(data: Record<string, any>): Promise<{
    sensitiveFieldCount: number;
    encryptedFieldCount: number;
    potentialSensitiveData: string[];
    dataFormats: Record<string, number>;
  }> {
    // Initialize report
    const report = {
      sensitiveFieldCount: 0,
      encryptedFieldCount: 0,
      potentialSensitiveData: [] as string[],
      dataFormats: {} as Record<string, number>
    };
    
    // Skip empty or non-object data
    if (!data || typeof data !== 'object') {
      return report;
    }
    
    const processObject = async (obj: Record<string, any>, path = ''): Promise<void> => {
      // Process each field
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        // Handle encrypted fields
        if (value && typeof value === 'object' && value.__encrypted) {
          report.encryptedFieldCount++;
          
          // Count data formats
          if (value.format) {
            report.dataFormats[value.format] = (report.dataFormats[value.format] || 0) + 1;
          }
          continue;
        }
        
        // Recursively process nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          await processObject(value, fieldPath);
          continue;
        }
        
        // Recursively process arrays
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (item && typeof item === 'object') {
              await processObject(item, `${fieldPath}[${i}]`);
            }
          }
          continue;
        }
        
        // Check for unencrypted sensitive fields
        if (this.shouldEncryptField(key, value)) {
          report.sensitiveFieldCount++;
          report.potentialSensitiveData.push(fieldPath);
          
          // Detect format
          const format = this.detectDataFormat(value);
          if (format) {
            report.dataFormats[format] = (report.dataFormats[format] || 0) + 1;
          }
        }
      }
    };
    
    await processObject(data);
    return report;
  }
}

// Export singleton instance
export const fieldEncryptionService = FieldEncryptionService.getInstance();
export default fieldEncryptionService; 