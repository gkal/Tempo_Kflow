import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import type { User } from '@/types/auth';

// Permission types supported by the system
type PermissionType = 
  | 'view_analytics'
  | 'edit_customer'
  | 'delete_customer'
  | 'approve_form'
  | 'view_admin'
  | 'manage_users';

/**
 * Hook for checking user permissions
 * @returns Object with permission checking functions
 */
export const useUserPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user permissions on load
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user?.id) {
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Default permissions based on user role
        if (user.role === "Admin" || user.role === "Super User") {
          setPermissions([
            'view_analytics',
            'edit_customer',
            'delete_customer',
            'approve_form',
            'view_admin',
            'manage_users'
          ]);
        } else if (user.role === "User") {
          setPermissions([
            'view_analytics',
            'edit_customer',
            'approve_form'
          ]);
        } else {
          // Read-only role
          setPermissions(['view_analytics']);
        }
      } catch (err) {
        console.error('Error fetching user permissions:', err);
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user?.id, user?.role]);

  /**
   * Check if the user has a specific permission
   * @param permission The permission to check
   * @returns boolean indicating if user has permission
   */
  const hasPermission = useCallback(
    (permission: PermissionType): boolean => {
      // If user is Admin or Super User, grant all permissions
      if (user?.role === "Admin" || user?.role === "Super User") {
        return true;
      }
      
      // Check if user has the specific permission
      return permissions.includes(permission);
    },
    [permissions, user?.role]
  );

  /**
   * Check if user has any of the specified permissions
   * @param requiredPermissions Array of permissions to check
   * @returns boolean indicating if user has any of the permissions
   */
  const hasAnyPermission = useCallback(
    (requiredPermissions: PermissionType[]): boolean => {
      // If user is Admin or Super User, grant all permissions
      if (user?.role === "Admin" || user?.role === "Super User") {
        return true;
      }
      
      // Check if user has any of the required permissions
      return requiredPermissions.some(permission => permissions.includes(permission));
    },
    [permissions, user?.role]
  );

  /**
   * Check if user has all of the specified permissions
   * @param requiredPermissions Array of permissions to check
   * @returns boolean indicating if user has all of the permissions
   */
  const hasAllPermissions = useCallback(
    (requiredPermissions: PermissionType[]): boolean => {
      // If user is Admin or Super User, grant all permissions
      if (user?.role === "Admin" || user?.role === "Super User") {
        return true;
      }
      
      // Check if user has all of the required permissions
      return requiredPermissions.every(permission => permissions.includes(permission));
    },
    [permissions, user?.role]
  );

  /**
   * Get all permissions for the current user
   * @returns Array of permission strings
   */
  const getUserPermissions = useCallback((): string[] => {
    return [...permissions];
  }, [permissions]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    isLoading,
    error
  };
}; 