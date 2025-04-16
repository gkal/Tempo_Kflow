/**
 * Session Management Service
 * 
 * Handles user sessions with enhanced security features including:
 * - Session timeout management
 * - Device fingerprinting
 * - Session tracking
 * - IP validation
 * - MFA verification status
 */

import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { createRecord, updateRecord, fetchRecordById, softDeleteRecord } from '@/services/supabaseService';
import UAParser from 'ua-parser-js';

// Default session configuration
const SESSION_CONFIG = {
  DEFAULT_TIMEOUT: 3600, // 1 hour in seconds
  EXTENDED_TIMEOUT: 86400, // 24 hours in seconds
  MAX_SESSIONS_PER_USER: 5, // Maximum number of active sessions per user
  CLEANUP_INTERVAL: 1000 * 60 * 60, // Check for expired sessions every hour
};

// Session interfaces
export interface SessionData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  refreshed_at: string;
  user_agent: string;
  ip_address: string;
  device_info: DeviceInfo;
  location_country?: string;
  location_city?: string;
  mfa_verified: boolean;
  mfa_required: boolean;
  mfa_method?: string;
}

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  deviceType: string;
  deviceVendor: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
  fingerprint?: string;
}

export interface SessionCreateOptions {
  userId: string;
  userAgent: string;
  ipAddress: string;
  mfaRequired: boolean;
  mfaVerified?: boolean;
  mfaMethod?: string;
  expiresInSeconds?: number;
}

export interface SessionValidateResult {
  isValid: boolean;
  requiresMfa: boolean;
  session?: SessionData;
  message?: string;
}

/**
 * User role type
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  READONLY = 'readonly'
}

/**
 * Permission type
 */
export enum Permission {
  // Form permissions
  CREATE_FORM = 'create:forms',
  EDIT_FORM = 'edit:forms',
  VIEW_FORM = 'view:forms',
  DELETE_FORM = 'delete:forms',
  APPROVE_FORM = 'approve:forms',
  
  // Customer permissions
  CREATE_CUSTOMER = 'create:customers',
  EDIT_CUSTOMER = 'edit:customers',
  VIEW_CUSTOMER = 'view:customers',
  DELETE_CUSTOMER = 'delete:customers',
  
  // User management permissions
  MANAGE_USERS = 'manage:users',
  
  // Approval workflow permissions
  APPROVAL_QUEUE = 'view:approvals',
  APPROVE_SUBMISSIONS = 'approve:submissions',
  REJECT_SUBMISSIONS = 'reject:submissions',
  
  // Audit trail permissions
  VIEW_AUDIT = 'view:audit',
  
  // Report permissions
  VIEW_REPORTS = 'view:reports',
  EXPORT_DATA = 'export:data',
  
  // System permissions
  CONFIGURE_SYSTEM = 'configure:system'
}

/**
 * Role to permission mappings
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission), // Admins have all permissions
  
  [UserRole.MANAGER]: [
    Permission.CREATE_FORM,
    Permission.EDIT_FORM,
    Permission.VIEW_FORM,
    Permission.DELETE_FORM,
    Permission.APPROVE_FORM,
    Permission.CREATE_CUSTOMER,
    Permission.EDIT_CUSTOMER,
    Permission.VIEW_CUSTOMER,
    Permission.DELETE_CUSTOMER,
    Permission.APPROVAL_QUEUE,
    Permission.APPROVE_SUBMISSIONS,
    Permission.REJECT_SUBMISSIONS,
    Permission.VIEW_AUDIT,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA
  ],
  
  [UserRole.USER]: [
    Permission.CREATE_FORM,
    Permission.EDIT_FORM,
    Permission.VIEW_FORM,
    Permission.CREATE_CUSTOMER,
    Permission.EDIT_CUSTOMER,
    Permission.VIEW_CUSTOMER,
    Permission.APPROVAL_QUEUE,
    Permission.APPROVE_SUBMISSIONS,
    Permission.REJECT_SUBMISSIONS,
    Permission.VIEW_REPORTS
  ],
  
  [UserRole.READONLY]: [
    Permission.VIEW_FORM,
    Permission.VIEW_CUSTOMER,
    Permission.VIEW_REPORTS
  ]
};

/**
 * Get the current user's role
 * @param userId User ID to check (defaults to current user)
 * @returns Promise resolving to the user's role
 */
export async function getUserRole(userId?: string): Promise<UserRole> {
  try {
    // If no userId provided, get the current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      
      if (!userId) {
        return UserRole.READONLY; // Default to readonly for unauthenticated users
      }
    }
    
    // Query the users table to get the role
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.error('Error getting user role:', error);
      return UserRole.READONLY; // Default to the most restrictive role
    }
    
    // Validate the role
    const role = data.role as UserRole;
    
    // Only return the role if it's valid, otherwise default to READONLY
    return Object.values(UserRole).includes(role) ? role : UserRole.READONLY;
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return UserRole.READONLY; // Default to the most restrictive role
  }
}

/**
 * Check if a user has a specific permission
 * @param permission The permission to check
 * @param userId Optional user ID (defaults to current user)
 * @returns Promise resolving to true if the user has the permission
 */
export async function checkUserPermission(
  permission: Permission,
  userId?: string
): Promise<boolean> {
  try {
    const userRole = await getUserRole(userId);
    
    // Check if the user's role has the required permission
    return rolePermissions[userRole].includes(permission);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false; // Default to denying permission on error
  }
}

/**
 * Service for managing user sessions with enhanced security features
 */
export class SessionService {
  /**
   * Initialize the session service with periodic cleanup
   */
  public static initialize(): void {
    this.setupSessionCleanup();
  }

  /**
   * Create a new session for a user
   * 
   * @param options Session creation options
   * @returns The created session
   */
  public static async createSession(options: SessionCreateOptions): Promise<SessionData> {
    try {
      // Parse user agent to get device information
      const deviceInfo = this.parseUserAgent(options.userAgent);
      
      // Calculate expiration time
      const expiresInSeconds = options.expiresInSeconds || SESSION_CONFIG.DEFAULT_TIMEOUT;
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);
      
      // Create the session record
      const sessionData: Partial<SessionData> = {
        id: uuidv4(),
        user_id: options.userId,
        user_agent: options.userAgent,
        ip_address: options.ipAddress,
        device_info: deviceInfo,
        mfa_required: options.mfaRequired,
        mfa_verified: options.mfaVerified || false,
        mfa_method: options.mfaMethod,
        refreshed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      };
      
      // Enrich with location data if available (would be added by middleware in production)
      if (options.ipAddress) {
        // In a real implementation, you would use a geolocation service here
        // For now, we'll just set placeholders
        sessionData.location_country = 'Unknown';
        sessionData.location_city = 'Unknown';
      }
      
      // Create the session in the database
      const session = await createRecord<Partial<SessionData>>('sessions', sessionData);
      
      // Enforce session limit per user (keep only the most recent sessions)
      await this.enforceSessionLimit(options.userId);
      
      return session as SessionData;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create user session');
    }
  }
  
  /**
   * Validate a session based on ID and options
   * 
   * @param sessionId ID of the session to validate
   * @param ipAddress Current IP address (optional for IP validation)
   * @param userAgent Current user agent (optional for device validation)
   * @returns Validation result
   */
  public static async validateSession(
    sessionId: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<SessionValidateResult> {
    try {
      // Get the session from the database
      const session = await fetchRecordById<SessionData>('sessions', sessionId);
      
      // Check if session exists
      if (!session) {
        return { isValid: false, requiresMfa: false, message: 'Session not found' };
      }
      
      // Check if session has expired
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (now > expiresAt) {
        return { isValid: false, requiresMfa: false, message: 'Session expired' };
      }
      
      // Check if MFA is required but not verified
      if (session.mfa_required && !session.mfa_verified) {
        return { 
          isValid: true, 
          requiresMfa: true, 
          session, 
          message: 'MFA verification required' 
        };
      }
      
      // If IP address is provided, validate it
      if (ipAddress && ipAddress !== session.ip_address) {
        // Check if the IP change is suspicious (in production, you would use a more sophisticated check)
        // For now, we'll just allow different IPs but log the change
        console.warn(`IP address change detected for session ${sessionId}: ${session.ip_address} -> ${ipAddress}`);
        
        // In production, you might want to:
        // 1. Check if the IPs are in the same geographic area
        // 2. Invalidate the session if the change is suspicious
        // 3. Require MFA re-verification for added security
      }
      
      // If user agent is provided, validate device continuity
      if (userAgent && userAgent !== session.user_agent) {
        // In production, you might want to compare the parsed user agents to detect major changes
        console.warn(`User agent change detected for session ${sessionId}`);
      }
      
      // Session is valid
      return { isValid: true, requiresMfa: false, session };
    } catch (error) {
      console.error('Error validating session:', error);
      return { isValid: false, requiresMfa: false, message: 'Failed to validate session' };
    }
  }
  
  /**
   * Refresh a session to extend its validity
   * 
   * @param sessionId ID of the session to refresh
   * @param expiresInSeconds New expiration time in seconds (optional)
   * @returns The refreshed session
   */
  public static async refreshSession(
    sessionId: string, 
    expiresInSeconds?: number
  ): Promise<SessionData | null> {
    try {
      // Calculate new expiration time
      const timeout = expiresInSeconds || SESSION_CONFIG.DEFAULT_TIMEOUT;
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + timeout);
      
      // Update the session
      const updatedSession = await updateRecord<Partial<SessionData>>('sessions', sessionId, {
        refreshed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });
      
      return updatedSession as SessionData;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
  }
  
  /**
   * End a session (logout)
   * 
   * @param sessionId ID of the session to end
   * @returns Whether the operation was successful
   */
  public static async endSession(sessionId: string): Promise<boolean> {
    try {
      // Simply delete the session
      const result = await softDeleteRecord('sessions', sessionId);
      return !!result;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }
  
  /**
   * End all sessions for a user
   * 
   * @param userId ID of the user to end sessions for
   * @param exceptSessionId ID of a session to exclude (optional)
   * @returns Whether the operation was successful
   */
  public static async endAllUserSessions(
    userId: string, 
    exceptSessionId?: string
  ): Promise<boolean> {
    try {
      // Get all sessions for the user
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId);
        
      if (error) {
        throw error;
      }
      
      // End each session except the excluded one
      for (const session of sessions || []) {
        if (exceptSessionId && session.id === exceptSessionId) {
          continue;
        }
        
        await softDeleteRecord('sessions', session.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error ending user sessions:', error);
      return false;
    }
  }
  
  /**
   * Mark a session as MFA verified
   * 
   * @param sessionId ID of the session to mark
   * @param mfaMethod MFA method used for verification
   * @returns The updated session
   */
  public static async markSessionMfaVerified(
    sessionId: string,
    mfaMethod: string
  ): Promise<SessionData | null> {
    try {
      // Update the session to mark as MFA verified
      const updatedSession = await updateRecord<Partial<SessionData>>('sessions', sessionId, {
        mfa_verified: true,
        mfa_method: mfaMethod
      });
      
      return updatedSession as SessionData;
    } catch (error) {
      console.error('Error marking session as MFA verified:', error);
      return null;
    }
  }
  
  /**
   * Get all active sessions for a user
   * 
   * @param userId ID of the user to get sessions for
   * @returns List of active sessions
   */
  public static async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      // Get all sessions that haven't expired
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', now);
        
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }
  
  /**
   * Set up periodic cleanup of expired sessions
   */
  private static setupSessionCleanup(): void {
    // Run cleanup immediately
    this.cleanupExpiredSessions();
    
    // Set up interval for periodic cleanup
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, SESSION_CONFIG.CLEANUP_INTERVAL);
  }
  
  /**
   * Clean up expired sessions
   */
  private static async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Get expired sessions
      const { data: expiredSessions, error } = await supabase
        .from('sessions')
        .select('id')
        .lt('expires_at', now);
        
      if (error) {
        throw error;
      }
      
      // Soft delete each expired session
      for (const session of expiredSessions || []) {
        await softDeleteRecord('sessions', session.id);
      }
      
      console.log(`Cleaned up ${expiredSessions?.length || 0} expired sessions`);
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }
  
  /**
   * Enforce the maximum number of sessions per user
   * 
   * @param userId ID of the user to enforce limit for
   */
  private static async enforceSessionLimit(userId: string): Promise<void> {
    try {
      // Get all sessions for the user
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // If the user has more sessions than allowed, delete the oldest ones
      if (sessions && sessions.length > SESSION_CONFIG.MAX_SESSIONS_PER_USER) {
        const sessionsToRemove = sessions.slice(SESSION_CONFIG.MAX_SESSIONS_PER_USER);
        
        for (const session of sessionsToRemove) {
          await softDeleteRecord('sessions', session.id);
        }
        
        console.log(`Enforced session limit for user ${userId}: removed ${sessionsToRemove.length} sessions`);
      }
    } catch (error) {
      console.error('Error enforcing session limit:', error);
    }
  }
  
  /**
   * Parse user agent string to extract device information
   * 
   * @param userAgent User agent string to parse
   * @returns Parsed device information
   */
  private static parseUserAgent(userAgent: string): DeviceInfo {
    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();
      
      return {
        browser: result.browser.name || 'Unknown',
        browserVersion: result.browser.version || 'Unknown',
        os: result.os.name || 'Unknown',
        osVersion: result.os.version || 'Unknown',
        device: result.device.model || 'Unknown',
        deviceType: result.device.type || 'Unknown',
        deviceVendor: result.device.vendor || 'Unknown',
        // These would be collected from client-side in a real implementation
        screenResolution: 'Unknown',
        language: 'Unknown',
        timezone: 'Unknown'
      };
    } catch (error) {
      console.error('Error parsing user agent:', error);
      
      // Return default values if parsing fails
      return {
        browser: 'Unknown',
        browserVersion: 'Unknown',
        os: 'Unknown',
        osVersion: 'Unknown',
        device: 'Unknown',
        deviceType: 'Unknown',
        deviceVendor: 'Unknown'
      };
    }
  }
} 