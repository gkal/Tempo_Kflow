/**
 * Multi-Factor Authentication Service
 * 
 * Provides functionality for implementing secure multi-factor authentication
 * including TOTP (Time-based One-Time Password), email verification,
 * and SMS authentication methods.
 */

import { supabase } from '@/lib/supabaseClient';
import * as OTPAuth from 'otpauth';
import { v4 as uuidv4 } from 'uuid';
import { createRecord, updateRecord, fetchRecordById } from '@/services/supabaseService';

// Define MFA types for better type safety
export enum MfaMethod {
  TOTP = 'totp',
  EMAIL = 'email',
  SMS = 'sms'
}

export interface MfaFactor {
  id: string;
  user_id: string;
  method: MfaMethod;
  secret: string;
  backup_codes?: string[];
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
}

export interface MfaSetupResult {
  secret: string;
  uri: string;
  qrCode?: string;
  backupCodes?: string[];
  factorId: string;
}

export interface MfaVerifyResult {
  success: boolean;
  message?: string;
  factorId?: string;
}

/**
 * Configuration for MFA service
 */
const MFA_CONFIG = {
  TOTP_ISSUER: 'K-Flow',
  TOTP_ALGORITHM: 'SHA1',
  TOTP_DIGITS: 6,
  TOTP_PERIOD: 30,
  BACKUP_CODES_COUNT: 10,
  BACKUP_CODE_LENGTH: 10,
  EMAIL_CODE_LENGTH: 6,
  SMS_CODE_LENGTH: 6,
  EMAIL_CODE_EXPIRY: 10 * 60 * 1000, // 10 minutes
  SMS_CODE_EXPIRY: 10 * 60 * 1000,   // 10 minutes
};

/**
 * MFA Service for implementing secure multi-factor authentication
 */
export class MfaService {
  /**
   * Set up TOTP multi-factor authentication for a user
   * 
   * @param userId User ID to set up MFA for
   * @param username Username for display in authenticator apps
   * @returns MFA setup information including secret and QR code
   */
  public static async setupTOTP(userId: string, username: string): Promise<MfaSetupResult> {
    try {
      // Generate a new TOTP secret
      const secret = this.generateTOTPSecret();
      
      // Create a TOTP object
      const totp = new OTPAuth.TOTP({
        issuer: MFA_CONFIG.TOTP_ISSUER,
        label: username,
        algorithm: MFA_CONFIG.TOTP_ALGORITHM,
        digits: MFA_CONFIG.TOTP_DIGITS,
        period: MFA_CONFIG.TOTP_PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret)
      });
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Create MFA entry in the database
      const mfaFactor = await createRecord<Partial<MfaFactor>>('user_mfa_factors', {
        user_id: userId,
        method: MfaMethod.TOTP,
        secret: secret,
        backup_codes: backupCodes,
        is_primary: false,
        is_verified: false
      });
      
      // Get the TOTP URI for QR code generation
      const uri = totp.toString();
      
      return {
        secret,
        uri,
        backupCodes,
        factorId: mfaFactor.id
      };
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      throw new Error('Failed to set up TOTP authentication');
    }
  }
  
  /**
   * Verify a TOTP code to confirm MFA setup
   * 
   * @param userId User ID to verify
   * @param factorId MFA factor ID to verify
   * @param code TOTP code to verify
   * @returns Result of verification
   */
  public static async verifyTOTP(userId: string, factorId: string, code: string): Promise<MfaVerifyResult> {
    try {
      // Get the MFA factor from the database
      const mfaFactor = await fetchRecordById<MfaFactor>('user_mfa_factors', factorId);
      
      if (!mfaFactor || mfaFactor.user_id !== userId || mfaFactor.method !== MfaMethod.TOTP) {
        return { success: false, message: 'Invalid MFA factor' };
      }
      
      // Create a TOTP object
      const totp = new OTPAuth.TOTP({
        issuer: MFA_CONFIG.TOTP_ISSUER,
        label: userId, // Not important for verification
        algorithm: MFA_CONFIG.TOTP_ALGORITHM,
        digits: MFA_CONFIG.TOTP_DIGITS,
        period: MFA_CONFIG.TOTP_PERIOD,
        secret: OTPAuth.Secret.fromBase32(mfaFactor.secret)
      });
      
      // Verify the TOTP code
      const delta = totp.validate({ token: code, window: 1 });
      
      // delta is null if invalid, otherwise the time step difference
      if (delta === null) {
        // Check if it's a backup code
        const backupCodes = mfaFactor.backup_codes as string[];
        if (backupCodes && backupCodes.includes(code)) {
          // Remove the used backup code
          const updatedBackupCodes = backupCodes.filter(c => c !== code);
          
          // Update the MFA factor
          await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factorId, {
            is_verified: true,
            backup_codes: updatedBackupCodes,
            last_used_at: new Date().toISOString()
          });
          
          return { success: true, factorId };
        }
        
        return { success: false, message: 'Invalid authentication code' };
      }
      
      // Update the MFA factor to mark as verified
      await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factorId, {
        is_verified: true,
        last_used_at: new Date().toISOString()
      });
      
      // If this is the first verified factor, set it as primary
      if (!mfaFactor.is_primary) {
        // Check if the user has any other primary factors
        const { data, error } = await supabase
          .from('user_mfa_factors')
          .select('id')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .eq('is_verified', true)
          .eq('is_deleted', false)
          .single();
          
        // If no other primary factor, set this one as primary
        if (error || !data) {
          await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factorId, {
            is_primary: true
          });
          
          // Also update the user to enable MFA
          await updateRecord('users', userId, {
            mfa_enabled: true,
            primary_mfa_method: MfaMethod.TOTP
          });
        }
      }
      
      return { success: true, factorId };
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return { success: false, message: 'Failed to verify authentication code' };
    }
  }
  
  /**
   * Validate a TOTP code during login or other operations
   * 
   * @param userId User ID to validate
   * @param code TOTP code to validate
   * @returns Result of validation
   */
  public static async validateTOTP(userId: string, code: string): Promise<MfaVerifyResult> {
    try {
      // Get all active TOTP factors for the user
      const { data: factors, error } = await supabase
        .from('user_mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .eq('method', MfaMethod.TOTP)
        .eq('is_verified', true)
        .eq('is_deleted', false);
        
      if (error || !factors || factors.length === 0) {
        return { success: false, message: 'No valid TOTP factors found' };
      }
      
      // Try to validate with each factor
      for (const factor of factors) {
        // Create a TOTP object
        const totp = new OTPAuth.TOTP({
          issuer: MFA_CONFIG.TOTP_ISSUER,
          label: userId, // Not important for validation
          algorithm: MFA_CONFIG.TOTP_ALGORITHM,
          digits: MFA_CONFIG.TOTP_DIGITS,
          period: MFA_CONFIG.TOTP_PERIOD,
          secret: OTPAuth.Secret.fromBase32(factor.secret)
        });
        
        // Validate the TOTP code
        const delta = totp.validate({ token: code, window: 1 });
        
        // If valid, update the last used timestamp and return success
        if (delta !== null) {
          await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factor.id, {
            last_used_at: new Date().toISOString()
          });
          
          return { success: true, factorId: factor.id };
        }
        
        // Check if it's a backup code
        const backupCodes = factor.backup_codes as string[];
        if (backupCodes && backupCodes.includes(code)) {
          // Remove the used backup code
          const updatedBackupCodes = backupCodes.filter(c => c !== code);
          
          // Update the MFA factor
          await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factor.id, {
            backup_codes: updatedBackupCodes,
            last_used_at: new Date().toISOString()
          });
          
          return { success: true, factorId: factor.id };
        }
      }
      
      // If no factor validated the code, return failure
      return { success: false, message: 'Invalid authentication code' };
    } catch (error) {
      console.error('Error validating TOTP:', error);
      return { success: false, message: 'Failed to validate authentication code' };
    }
  }
  
  /**
   * Generate and send an email verification code
   * 
   * @param userId User ID to generate code for
   * @param email Email to send code to
   * @returns Result of email code setup
   */
  public static async setupEmailMFA(userId: string, email: string): Promise<MfaSetupResult> {
    try {
      // Generate a verification code
      const code = this.generateRandomCode(MFA_CONFIG.EMAIL_CODE_LENGTH);
      
      // Create MFA entry in the database
      const mfaFactor = await createRecord<Partial<MfaFactor>>('user_mfa_factors', {
        user_id: userId,
        method: MfaMethod.EMAIL,
        secret: JSON.stringify({ 
          code, 
          email, 
          expires: Date.now() + MFA_CONFIG.EMAIL_CODE_EXPIRY 
        }),
        is_primary: false,
        is_verified: false
      });
      
      // TODO: Send the code via email using EmailService
      // For now, we'll just return the code for testing
      return {
        secret: code,
        uri: `mailto:${email}`,
        factorId: mfaFactor.id
      };
    } catch (error) {
      console.error('Error setting up email MFA:', error);
      throw new Error('Failed to set up email authentication');
    }
  }
  
  /**
   * Verify an email code to confirm MFA setup
   * 
   * @param userId User ID to verify
   * @param factorId MFA factor ID to verify
   * @param code Email code to verify
   * @returns Result of verification
   */
  public static async verifyEmailMFA(userId: string, factorId: string, code: string): Promise<MfaVerifyResult> {
    try {
      // Get the MFA factor from the database
      const mfaFactor = await fetchRecordById<MfaFactor>('user_mfa_factors', factorId);
      
      if (!mfaFactor || mfaFactor.user_id !== userId || mfaFactor.method !== MfaMethod.EMAIL) {
        return { success: false, message: 'Invalid MFA factor' };
      }
      
      // Parse the secret data
      const secretData = JSON.parse(mfaFactor.secret);
      
      // Check if the code has expired
      if (Date.now() > secretData.expires) {
        return { success: false, message: 'Verification code has expired' };
      }
      
      // Verify the code
      if (secretData.code !== code) {
        return { success: false, message: 'Invalid verification code' };
      }
      
      // Update the MFA factor to mark as verified
      await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factorId, {
        is_verified: true,
        last_used_at: new Date().toISOString(),
        // Store only the email, not the verification code
        secret: JSON.stringify({ email: secretData.email })
      });
      
      // If this is the first verified factor, set it as primary
      if (!mfaFactor.is_primary) {
        // Check if the user has any other primary factors
        const { data, error } = await supabase
          .from('user_mfa_factors')
          .select('id')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .eq('is_verified', true)
          .eq('is_deleted', false)
          .single();
          
        // If no other primary factor, set this one as primary
        if (error || !data) {
          await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factorId, {
            is_primary: true
          });
          
          // Also update the user to enable MFA
          await updateRecord('users', userId, {
            mfa_enabled: true,
            primary_mfa_method: MfaMethod.EMAIL
          });
        }
      }
      
      return { success: true, factorId };
    } catch (error) {
      console.error('Error verifying email MFA:', error);
      return { success: false, message: 'Failed to verify email code' };
    }
  }
  
  /**
   * Send a new email verification code for login
   * 
   * @param userId User ID to generate code for
   * @returns Result of email code generation
   */
  public static async sendLoginEmailCode(userId: string): Promise<MfaVerifyResult> {
    try {
      // Get the primary email MFA factor for the user
      const { data: factor, error } = await supabase
        .from('user_mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .eq('method', MfaMethod.EMAIL)
        .eq('is_verified', true)
        .eq('is_deleted', false)
        .eq('is_primary', true)
        .single();
        
      if (error || !factor) {
        return { success: false, message: 'No valid email factor found' };
      }
      
      // Parse the secret data to get the email
      const secretData = JSON.parse(factor.secret);
      
      // Generate a new verification code
      const code = this.generateRandomCode(MFA_CONFIG.EMAIL_CODE_LENGTH);
      
      // Update the factor with the new code
      await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factor.id, {
        secret: JSON.stringify({ 
          code, 
          email: secretData.email, 
          expires: Date.now() + MFA_CONFIG.EMAIL_CODE_EXPIRY 
        })
      });
      
      // TODO: Send the code via email using EmailService
      // For now, we'll just return success
      return { success: true, factorId: factor.id };
    } catch (error) {
      console.error('Error sending login email code:', error);
      return { success: false, message: 'Failed to send email code' };
    }
  }
  
  /**
   * Validate an email code during login
   * 
   * @param userId User ID to validate
   * @param code Email code to validate
   * @returns Result of validation
   */
  public static async validateEmailCode(userId: string, code: string): Promise<MfaVerifyResult> {
    try {
      // Get all active email factors for the user
      const { data: factors, error } = await supabase
        .from('user_mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .eq('method', MfaMethod.EMAIL)
        .eq('is_verified', true)
        .eq('is_deleted', false);
        
      if (error || !factors || factors.length === 0) {
        return { success: false, message: 'No valid email factors found' };
      }
      
      // Try to validate with each factor
      for (const factor of factors) {
        // Parse the secret data
        const secretData = JSON.parse(factor.secret);
        
        // Skip if the factor doesn't have a verification code
        if (!secretData.code) continue;
        
        // Check if the code has expired
        if (secretData.expires && Date.now() > secretData.expires) {
          continue;
        }
        
        // Verify the code
        if (secretData.code === code) {
          // Update the factor to remove the code
          await updateRecord<Partial<MfaFactor>>('user_mfa_factors', factor.id, {
            last_used_at: new Date().toISOString(),
            // Store only the email, not the verification code
            secret: JSON.stringify({ email: secretData.email })
          });
          
          return { success: true, factorId: factor.id };
        }
      }
      
      // If no factor validated the code, return failure
      return { success: false, message: 'Invalid verification code' };
    } catch (error) {
      console.error('Error validating email code:', error);
      return { success: false, message: 'Failed to validate email code' };
    }
  }
  
  /**
   * Disable MFA for a user
   * 
   * @param userId User ID to disable MFA for
   * @returns Whether the operation was successful
   */
  public static async disableMFA(userId: string): Promise<boolean> {
    try {
      // Soft delete all MFA factors for the user
      await supabase.rpc('soft_delete_record', {
        p_table_name: 'user_mfa_factors',
        p_column_name: 'user_id',
        p_value: userId
      });
      
      // Update the user to disable MFA
      await updateRecord('users', userId, {
        mfa_enabled: false,
        primary_mfa_method: null
      });
      
      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      return false;
    }
  }
  
  /**
   * List all MFA factors for a user
   * 
   * @param userId User ID to list factors for
   * @returns List of MFA factors
   */
  public static async listMfaFactors(userId: string): Promise<MfaFactor[]> {
    try {
      const { data, error } = await supabase
        .from('user_mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error listing MFA factors:', error);
      return [];
    }
  }
  
  /**
   * Generate a TOTP secret for use with authenticator apps
   */
  private static generateTOTPSecret(): string {
    return new OTPAuth.Secret().base32;
  }
  
  /**
   * Generate backup codes for a user
   */
  private static generateBackupCodes(): string[] {
    const backupCodes: string[] = [];
    
    for (let i = 0; i < MFA_CONFIG.BACKUP_CODES_COUNT; i++) {
      backupCodes.push(this.generateRandomCode(MFA_CONFIG.BACKUP_CODE_LENGTH));
    }
    
    return backupCodes;
  }
  
  /**
   * Generate a random alphanumeric code
   * 
   * @param length Length of the code
   * @returns Random code
   */
  private static generateRandomCode(length: number): string {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    
    // Use crypto API for better randomness if available
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const randomValues = new Uint32Array(length);
      window.crypto.getRandomValues(randomValues);
      
      for (let i = 0; i < length; i++) {
        result += charset.charAt(randomValues[i] % charset.length);
      }
    } else {
      // Fallback for non-browser environments
      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }
    
    return result;
  }
} 