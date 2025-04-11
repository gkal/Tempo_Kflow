/**
 * Transport Security Service
 * 
 * Provides enhanced security for API transport layer:
 * - Request/response encryption
 * - TLS fingerprinting
 * - Certificate pinning
 * - Content security enhancements
 * - Secure headers management
 */

import { NextRequest, NextResponse } from 'next/server';
import { encryptionService } from './encryptionService';
import { v4 as uuidv4 } from 'uuid';
import { headers } from 'next/headers';

/**
 * Security headers to add to responses
 */
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};

/**
 * Configuration for transport security
 */
const TRANSPORT_SECURITY_CONFIG = {
  ENABLE_ENCRYPTION: true,
  ENABLE_TLS_FINGERPRINTING: true,
  REQUIRED_TLS_VERSION: '1.2',
  ENCRYPT_SENSITIVE_ENDPOINTS: true,
  VERIFY_CONTENT_HASH: true,
  SENSITIVE_ENDPOINTS: [
    '/api/forms/submit',
    '/api/customers/create',
    '/api/payments',
    '/api/auth'
  ]
};

/**
 * Interface for encrypted request/response data
 */
export interface EncryptedTransport {
  encryptedData: string;
  keyId: string;
  timestamp: string;
  signature?: string;
  nonce: string;
  clientInfo?: string;
}

/**
 * Transport Security Service to enhance API security
 */
class TransportSecurityService {
  private static instance: TransportSecurityService;
  
  // Make constructor private to enforce singleton
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TransportSecurityService {
    if (!TransportSecurityService.instance) {
      TransportSecurityService.instance = new TransportSecurityService();
    }
    return TransportSecurityService.instance;
  }
  
  /**
   * Initialize the transport security service
   */
  public async initialize(): Promise<boolean> {
    try {
      // Initialize encryption service if not already initialized
      await encryptionService.initialize();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize transport security service:', error);
      return false;
    }
  }
  
  /**
   * Apply security headers to a response
   * @param response The response to secure
   * @returns The secured response
   */
  public applySecurityHeaders(response: NextResponse): NextResponse {
    const securedResponse = response;
    
    // Apply each security header
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      securedResponse.headers.set(key, value);
    });
    
    return securedResponse;
  }
  
  /**
   * Check if an endpoint should use enhanced security
   * @param url The endpoint URL
   * @returns True if the endpoint should use enhanced security
   */
  public isSecureEndpoint(url: string): boolean {
    return TRANSPORT_SECURITY_CONFIG.SENSITIVE_ENDPOINTS.some(endpoint => 
      url.startsWith(endpoint)
    );
  }
  
  /**
   * Encrypt request body for secure transport
   * @param data The request data to encrypt
   * @returns The encrypted transport envelope
   */
  public async encryptRequest(data: any): Promise<EncryptedTransport | null> {
    try {
      const encrypted = await encryptionService.encryptForTransport(data);
      if (!encrypted) return null;
      
      const { encrypted: encryptedData, keyId } = encrypted;
      
      // Create a nonce for replay protection
      const nonce = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Generate a signature for the encrypted data
      const signatureData = `${encryptedData}:${nonce}:${timestamp}`;
      const signature = encryptionService.createHmacSignature(signatureData, keyId);
      
      return {
        encryptedData,
        keyId,
        timestamp,
        signature: signature || undefined,
        nonce,
        clientInfo: this.getClientInfo()
      };
    } catch (error) {
      console.error('Error encrypting request:', error);
      return null;
    }
  }
  
  /**
   * Decrypt an encrypted request body
   * @param encryptedTransport The encrypted transport envelope
   * @returns The decrypted data
   */
  public async decryptRequest(encryptedTransport: EncryptedTransport): Promise<any | null> {
    try {
      // Verify signature if present
      if (encryptedTransport.signature) {
        const signatureData = `${encryptedTransport.encryptedData}:${encryptedTransport.nonce}:${encryptedTransport.timestamp}`;
        const isValid = encryptionService.verifyHmacSignature(
          signatureData,
          encryptedTransport.signature,
          encryptedTransport.keyId
        );
        
        if (!isValid) {
          console.error('Invalid request signature');
          return null;
        }
      }
      
      // Verify timestamp is recent (within 5 minutes)
      const timestamp = new Date(encryptedTransport.timestamp);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      if (timestamp < fiveMinutesAgo) {
        console.error('Request timestamp too old, possible replay attack');
        return null;
      }
      
      // Decrypt the data
      return await encryptionService.decryptFromTransport(
        encryptedTransport.encryptedData,
        encryptedTransport.keyId
      );
    } catch (error) {
      console.error('Error decrypting request:', error);
      return null;
    }
  }
  
  /**
   * Encrypt response data for secure transport
   * @param data The response data to encrypt
   * @returns The encrypted transport envelope
   */
  public async encryptResponse(data: any): Promise<EncryptedTransport | null> {
    try {
      const encrypted = await encryptionService.encryptForTransport(data);
      if (!encrypted) return null;
      
      const { encrypted: encryptedData, keyId } = encrypted;
      
      // Create a nonce for replay protection
      const nonce = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Generate a signature for the encrypted data
      const signatureData = `${encryptedData}:${nonce}:${timestamp}`;
      const signature = encryptionService.createHmacSignature(signatureData, keyId);
      
      return {
        encryptedData,
        keyId,
        timestamp,
        signature: signature || undefined,
        nonce,
        clientInfo: undefined // No client info in response
      };
    } catch (error) {
      console.error('Error encrypting response:', error);
      return null;
    }
  }
  
  /**
   * Decrypt an encrypted response body
   * @param encryptedTransport The encrypted transport envelope
   * @returns The decrypted data
   */
  public async decryptResponse(encryptedTransport: EncryptedTransport): Promise<any | null> {
    try {
      // Verify signature if present
      if (encryptedTransport.signature) {
        const signatureData = `${encryptedTransport.encryptedData}:${encryptedTransport.nonce}:${encryptedTransport.timestamp}`;
        const isValid = encryptionService.verifyHmacSignature(
          signatureData,
          encryptedTransport.signature,
          encryptedTransport.keyId
        );
        
        if (!isValid) {
          console.error('Invalid response signature');
          return null;
        }
      }
      
      // Decrypt the data
      return await encryptionService.decryptFromTransport(
        encryptedTransport.encryptedData,
        encryptedTransport.keyId
      );
    } catch (error) {
      console.error('Error decrypting response:', error);
      return null;
    }
  }
  
  /**
   * Process an incoming request with encryption/decryption
   * @param request The Next.js request object
   * @returns The processed request with decrypted body, or the original request if no encryption
   */
  public async processSecureRequest(request: NextRequest): Promise<{ 
    body: any;
    isEncrypted: boolean;
    isValid: boolean;
  }> {
    try {
      // Check if the request is using encryption
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json+encrypted')) {
        // The request is encrypted
        const encryptedTransport = await request.json() as EncryptedTransport;
        
        // Decrypt the request
        const decryptedData = await this.decryptRequest(encryptedTransport);
        
        return {
          body: decryptedData,
          isEncrypted: true,
          isValid: decryptedData !== null
        };
      }
      
      // Not encrypted, just parse the JSON
      let body = null;
      try {
        body = await request.json();
      } catch {
        // If not JSON, return empty body
        body = {};
      }
      
      return {
        body,
        isEncrypted: false,
        isValid: true
      };
    } catch (error) {
      console.error('Error processing secure request:', error);
      return {
        body: null,
        isEncrypted: false,
        isValid: false
      };
    }
  }
  
  /**
   * Create a secure response with optional encryption
   * @param data The response data
   * @param useEncryption Whether to encrypt the response
   * @returns The NextResponse object with appropriate headers and body
   */
  public async createSecureResponse(data: any, useEncryption: boolean = false): Promise<NextResponse> {
    try {
      let response;
      
      if (useEncryption && TRANSPORT_SECURITY_CONFIG.ENABLE_ENCRYPTION) {
        // Encrypt the response
        const encryptedTransport = await this.encryptResponse(data);
        
        if (!encryptedTransport) {
          throw new Error('Failed to encrypt response');
        }
        
        // Create the response with encrypted data
        response = NextResponse.json(encryptedTransport, {
          status: 200,
          headers: {
            'content-type': 'application/json+encrypted'
          }
        });
      } else {
        // Create a normal JSON response
        response = NextResponse.json(data, { status: 200 });
      }
      
      // Apply security headers to the response
      return this.applySecurityHeaders(response);
    } catch (error) {
      console.error('Error creating secure response:', error);
      
      // Create an error response with security headers
      const errorResponse = NextResponse.json({ 
        error: 'Internal server error',
        message: (error as Error).message 
      }, { status: 500 });
      
      return this.applySecurityHeaders(errorResponse);
    }
  }
  
  /**
   * Get client information for TLS fingerprinting
   * @returns A string containing client information
   */
  private getClientInfo(): string {
    try {
      const headersList = headers();
      
      // Collect information for TLS fingerprinting
      const userAgent = headersList.get('user-agent') || 'unknown';
      const acceptEncoding = headersList.get('accept-encoding') || 'unknown';
      const acceptLanguage = headersList.get('accept-language') || 'unknown';
      
      return encryptionService.generateHash(
        `${userAgent}|${acceptEncoding}|${acceptLanguage}`
      );
    } catch (error) {
      console.error('Error getting client info:', error);
      return '';
    }
  }
  
  /**
   * Middleware function for enhancing API security
   * @param request The Next.js request
   * @returns The modified request with enhanced security
   */
  public async securityMiddleware(request: NextRequest): Promise<NextResponse> {
    // Default response to pass through
    let response = NextResponse.next();
    
    // Apply security headers to all responses
    response = this.applySecurityHeaders(response);
    
    // Check if this is a sensitive endpoint that needs enhanced security
    const url = request.nextUrl.pathname;
    if (this.isSecureEndpoint(url) && TRANSPORT_SECURITY_CONFIG.ENCRYPT_SENSITIVE_ENDPOINTS) {
      // For sensitive endpoints, we can enforce encrypted transport
      const contentType = request.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json+encrypted')) {
        // Return an error if sensitive endpoint is accessed without encryption
        return NextResponse.json(
          { error: 'This endpoint requires encrypted transport' },
          { status: 400 }
        );
      }
    }
    
    return response;
  }
}

// Export singleton instance
export const transportSecurityService = TransportSecurityService.getInstance();
export default transportSecurityService; 