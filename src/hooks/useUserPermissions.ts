import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/stores/userStore';

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
  const { user } = useUserStore();
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
        // Fetch user role from Supabase
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userError) {
          throw new Error(userError.message);
        }

        // Get permissions for the user's role
        const { data: rolePermissions, error: permissionsError } = await supabase
          .from('roles')
          .select('permissions')
          .eq('name', userData.role)
          .single();

        if (permissionsError) {
          throw new Error(permissionsError.message);
        }

        // Set the permissions
        setPermissions(rolePermissions.permissions || []);
      } catch (err) {
        console.error('Error fetching user permissions:', err);
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        
        // Default permissions based on user metadata
        // This is a fallback if the database tables don't exist yet
        if (user?.user_metadata?.role === 'admin') {
          setPermissions([
            'view_analytics',
            'edit_customer',
            'delete_customer',
            'approve_form',
            'view_admin',
            'manage_users'
          ]);
        } else if (user?.user_metadata?.role === 'manager') {
          setPermissions([
            'view_analytics',
            'edit_customer',
            'approve_form'
          ]);
        } else {
          setPermissions(['edit_customer']);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user?.id, user?.user_metadata?.role]);

  /**
   * Check if the user has a specific permission
   * @param permission The permission to check
   * @returns boolean indicating if user has permission
   */
  const hasPermission = useCallback(
    (permission: PermissionType): boolean => {
      // If user is superadmin, grant all permissions
      if (user?.user_metadata?.role === 'superadmin') {
        return true;
      }
      
      // Check if user has the specific permission
      return permissions.includes(permission);
    },
    [permissions, user?.user_metadata?.role]
  );

  /**
   * Check if user has any of the specified permissions
   * @param requiredPermissions Array of permissions to check
   * @returns boolean indicating if user has any of the permissions
   */
  const hasAnyPermission = useCallback(
    (requiredPermissions: PermissionType[]): boolean => {
      // If user is superadmin, grant all permissions
      if (user?.user_metadata?.role === 'superadmin') {
        return true;
      }
      
      // Check if user has any of the required permissions
      return requiredPermissions.some(permission => permissions.includes(permission));
    },
    [permissions, user?.user_metadata?.role]
  );

  /**
   * Check if user has all of the specified permissions
   * @param requiredPermissions Array of permissions to check
   * @returns boolean indicating if user has all of the permissions
   */
  const hasAllPermissions = useCallback(
    (requiredPermissions: PermissionType[]): boolean => {
      // If user is superadmin, grant all permissions
      if (user?.user_metadata?.role === 'superadmin') {
        return true;
      }
      
      // Check if user has all of the required permissions
      return requiredPermissions.every(permission => permissions.includes(permission));
    },
    [permissions, user?.user_metadata?.role]
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