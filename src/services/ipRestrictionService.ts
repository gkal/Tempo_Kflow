/**
 * IP Restriction Service
 * 
 * Manages IP address restrictions including whitelists and blacklists.
 * Provides functionality to check if an IP is allowed to access the system
 * and to manage IP restriction rules.
 */

import { supabase } from '@/lib/supabaseClient';
import { createRecord, updateRecord, fetchRecords, softDeleteRecord } from '@/services/supabaseService';
import isSubnet from 'is-subnet';

// Types for IP restrictions
export enum RestrictionType {
  WHITELIST = 'whitelist',
  BLACKLIST = 'blacklist'
}

export interface IpRestriction {
  id: string;
  ip_address: string;
  restriction_type: RestrictionType;
  reason?: string;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface IpRestrictionException {
  id: string;
  restriction_id: string;
  user_id: string;
  reason?: string;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface IpCheckResult {
  isAllowed: boolean;
  matchingRule?: IpRestriction;
  exceptionApplied?: boolean;
}

/**
 * Service for managing IP address restrictions
 */
export class IpRestrictionService {
  /**
   * Check if an IP address is allowed based on whitelist and blacklist rules
   * 
   * @param ipAddress IP address to check
   * @param userId Optional user ID to check for exceptions
   * @returns Whether the IP is allowed and why
   */
  public static async isIpAllowed(ipAddress: string, userId?: string): Promise<IpCheckResult> {
    try {
      // Use the database function for efficient checking
      const { data, error } = await supabase.rpc('is_ip_allowed', { 
        check_ip: ipAddress,
        check_user_id: userId || null
      });
      
      if (error) {
        console.error('Error checking IP restrictions:', error);
        // Default to allowed in case of error
        return { isAllowed: true };
      }
      
      // Get the matching rule for more detailed information
      const matchingRule = await this.getMatchingRestrictionRule(ipAddress);
      
      // Check if there's an exception for this user (if userId provided)
      let exceptionApplied = false;
      if (userId && matchingRule && matchingRule.restriction_type === RestrictionType.BLACKLIST) {
        exceptionApplied = await this.hasUserException(userId, matchingRule.id);
      }
      
      return {
        isAllowed: !!data,
        matchingRule,
        exceptionApplied
      };
    } catch (error) {
      console.error('Error in isIpAllowed:', error);
      // Default to allowed in case of error
      return { isAllowed: true };
    }
  }
  
  /**
   * Add a new IP restriction (whitelist or blacklist)
   * 
   * @param ipAddress IP address or CIDR range to restrict
   * @param type Type of restriction (whitelist or blacklist)
   * @param reason Reason for the restriction
   * @param createdBy User who created the restriction
   * @param expiresAt Optional expiration date
   * @returns The created restriction
   */
  public static async addIpRestriction(
    ipAddress: string,
    type: RestrictionType,
    reason?: string,
    createdBy?: string,
    expiresAt?: Date
  ): Promise<IpRestriction> {
    try {
      // Validate the IP format (should be a valid IP address or CIDR notation)
      if (!this.isValidIpOrCidr(ipAddress)) {
        throw new Error('Invalid IP address or CIDR format');
      }
      
      // Create the restriction
      const restriction = await createRecord<Partial<IpRestriction>>('ip_restrictions', {
        ip_address: ipAddress,
        restriction_type: type,
        reason,
        created_by: createdBy,
        expires_at: expiresAt?.toISOString(),
        is_active: true
      });
      
      return restriction as IpRestriction;
    } catch (error) {
      console.error('Error adding IP restriction:', error);
      throw new Error('Failed to add IP restriction');
    }
  }
  
  /**
   * Update an existing IP restriction
   * 
   * @param restrictionId ID of the restriction to update
   * @param updates Updates to apply
   * @returns The updated restriction
   */
  public static async updateIpRestriction(
    restrictionId: string,
    updates: Partial<IpRestriction>
  ): Promise<IpRestriction | null> {
    try {
      // Prevent updating certain fields
      const safeUpdates: Partial<IpRestriction> = {
        reason: updates.reason,
        expires_at: updates.expires_at,
        is_active: updates.is_active
      };
      
      // Update the restriction
      const updatedRestriction = await updateRecord<Partial<IpRestriction>>(
        'ip_restrictions',
        restrictionId,
        safeUpdates
      );
      
      return updatedRestriction as IpRestriction;
    } catch (error) {
      console.error('Error updating IP restriction:', error);
      return null;
    }
  }
  
  /**
   * Delete an IP restriction
   * 
   * @param restrictionId ID of the restriction to delete
   * @returns Whether the deletion was successful
   */
  public static async deleteIpRestriction(restrictionId: string): Promise<boolean> {
    try {
      // Soft delete the restriction and its exceptions
      await softDeleteRecord('ip_restrictions', restrictionId);
      
      // Delete related exceptions
      const { error } = await supabase.rpc('soft_delete_record', {
        p_table_name: 'ip_restriction_exceptions',
        p_column_name: 'restriction_id',
        p_value: restrictionId
      });
      
      if (error) {
        console.error('Error deleting related exceptions:', error);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting IP restriction:', error);
      return false;
    }
  }
  
  /**
   * Get all IP restrictions
   * 
   * @param type Optional type to filter by (whitelist or blacklist)
   * @param includeInactive Whether to include inactive restrictions
   * @param includeExpired Whether to include expired restrictions
   * @returns List of IP restrictions
   */
  public static async getIpRestrictions(
    type?: RestrictionType,
    includeInactive = false,
    includeExpired = false
  ): Promise<IpRestriction[]> {
    try {
      // Start with a basic query
      let query = supabase.from('ip_restrictions').select('*');
      
      // Apply filters
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      if (type) {
        query = query.eq('restriction_type', type);
      }
      
      if (!includeExpired) {
        const now = new Date().toISOString();
        query = query.or(`expires_at.is.null,expires_at.gt.${now}`);
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data as IpRestriction[];
    } catch (error) {
      console.error('Error getting IP restrictions:', error);
      return [];
    }
  }
  
  /**
   * Add an exception for a user to a restriction
   * 
   * @param userId ID of the user to exempt
   * @param restrictionId ID of the restriction to exempt from
   * @param reason Reason for the exception
   * @param createdBy User who created the exception
   * @param expiresAt Optional expiration date
   * @returns The created exception
   */
  public static async addUserException(
    userId: string,
    restrictionId: string,
    reason?: string,
    createdBy?: string,
    expiresAt?: Date
  ): Promise<IpRestrictionException> {
    try {
      // Create the exception
      const exception = await createRecord<Partial<IpRestrictionException>>('ip_restriction_exceptions', {
        restriction_id: restrictionId,
        user_id: userId,
        reason,
        created_by: createdBy,
        expires_at: expiresAt?.toISOString(),
        is_active: true
      });
      
      return exception as IpRestrictionException;
    } catch (error) {
      console.error('Error adding user exception:', error);
      throw new Error('Failed to add user exception');
    }
  }
  
  /**
   * Remove an exception for a user
   * 
   * @param exceptionId ID of the exception to remove
   * @returns Whether the removal was successful
   */
  public static async removeUserException(exceptionId: string): Promise<boolean> {
    try {
      // Soft delete the exception
      await softDeleteRecord('ip_restriction_exceptions', exceptionId);
      return true;
    } catch (error) {
      console.error('Error removing user exception:', error);
      return false;
    }
  }
  
  /**
   * Get all exceptions for a user
   * 
   * @param userId ID of the user to get exceptions for
   * @param includeInactive Whether to include inactive exceptions
   * @param includeExpired Whether to include expired exceptions
   * @returns List of exceptions
   */
  public static async getUserExceptions(
    userId: string,
    includeInactive = false,
    includeExpired = false
  ): Promise<IpRestrictionException[]> {
    try {
      // Start with a basic query
      let query = supabase
        .from('ip_restriction_exceptions')
        .select('*, ip_restrictions(*)')
        .eq('user_id', userId);
      
      // Apply filters
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      if (!includeExpired) {
        const now = new Date().toISOString();
        query = query.or(`expires_at.is.null,expires_at.gt.${now}`);
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data as IpRestrictionException[];
    } catch (error) {
      console.error('Error getting user exceptions:', error);
      return [];
    }
  }
  
  /**
   * Check if a user has an exception for a specific restriction
   * 
   * @param userId ID of the user to check
   * @param restrictionId ID of the restriction to check
   * @returns Whether the user has an exception
   */
  private static async hasUserException(
    userId: string,
    restrictionId: string
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      
      // Query for active exception
      const { data, error } = await supabase
        .from('ip_restriction_exceptions')
        .select('id')
        .eq('user_id', userId)
        .eq('restriction_id', restrictionId)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .maybeSingle();
        
      if (error) {
        throw error;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error checking user exception:', error);
      return false;
    }
  }
  
  /**
   * Get the matching restriction rule for an IP address
   * 
   * @param ipAddress IP address to check
   * @returns The matching restriction rule, if any
   */
  private static async getMatchingRestrictionRule(ipAddress: string): Promise<IpRestriction | null> {
    try {
      const now = new Date().toISOString();
      
      // Get all active restrictions
      const { data, error } = await supabase
        .from('ip_restrictions')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`);
        
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Check each restriction for a match
      for (const restriction of data) {
        if (this.isIpInCidr(ipAddress, restriction.ip_address)) {
          return restriction as IpRestriction;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting matching restriction rule:', error);
      return null;
    }
  }
  
  /**
   * Check if an IP address is in a CIDR range
   * 
   * @param ip IP address to check
   * @param cidr CIDR range to check against
   * @returns Whether the IP is in the CIDR range
   */
  private static isIpInCidr(ip: string, cidr: string): boolean {
    try {
      // If the CIDR is actually just an IP, compare directly
      if (!cidr.includes('/')) {
        return ip === cidr;
      }
      
      // Otherwise, use the is-subnet library to check
      return isSubnet.check(ip, cidr);
    } catch (error) {
      console.error('Error checking IP in CIDR:', error);
      return false;
    }
  }
  
  /**
   * Validate an IP address or CIDR range
   * 
   * @param ipOrCidr IP address or CIDR range to validate
   * @returns Whether the input is valid
   */
  private static isValidIpOrCidr(ipOrCidr: string): boolean {
    // Simple regex for IPv4 address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    
    // Simple regex for IPv6 address
    const ipv6Regex = /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}(\/\d{1,3})?$/;
    
    return ipv4Regex.test(ipOrCidr) || ipv6Regex.test(ipOrCidr);
  }
} 