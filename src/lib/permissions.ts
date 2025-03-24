/**
 * Comprehensive permission system for role-based access control
 */
import * as React from 'react';

/**
 * Permission types for different actions
 */
export type Permission =
  | boolean                               // Full permission (true) or no permission (false)
  | "self-only"                           // Can only perform action on self
  | "self-password-only"                  // Can only change own password
  | "self-password-department-status-only" // Can change password, department, and status for self
  | "assigned-only"                       // Can only act on items assigned to them
  | "team-only";                          // Can only act on items assigned to their team

/**
 * Available actions for each module
 */
export interface ModulePermissions {
  view: Permission;
  edit?: Permission;
  create?: Permission;
  delete?: Permission;
  recover?: Permission;
  approve?: Permission;
  export?: Permission;
}

/**
 * User roles in the system
 */
export enum UserRole {
  Admin = "Admin",
  SuperUser = "Super User",
  User = "User",
  ReadOnly = "Μόνο ανάγνωση"
}

/**
 * Modules/sections available in the application
 */
export enum Module {
  Users = "users",
  Dashboard = "dashboard",
  Settings = "settings",
  Customers = "customers",
  Offers = "offers",
  Tasks = "tasks",
  Reports = "reports"
}

/**
 * Module-specific actions
 */
export enum Action {
  View = "view",
  Edit = "edit",
  Create = "create",
  Delete = "delete",
  Recover = "recover",
  Approve = "approve",
  Export = "export"
}

/**
 * Permissions for each module
 */
export interface RolePermissions {
  users: ModulePermissions;
  dashboard: ModulePermissions;
  settings: ModulePermissions;
  customers?: ModulePermissions;
  offers?: ModulePermissions;
  tasks?: ModulePermissions;
  reports?: ModulePermissions;
}

/**
 * Permission definitions for each role
 */
const permissions: Record<UserRole, RolePermissions> = {
  [UserRole.Admin]: {
    users: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      recover: true,
    },
    dashboard: {
      view: true,
      edit: true,
    },
    settings: {
      view: true,
      edit: true,
    },
    customers: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      recover: true,
      export: true
    },
    offers: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
      export: true
    },
    tasks: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true
    },
    reports: {
      view: true,
      create: true,
      export: true
    }
  },
  [UserRole.SuperUser]: {
    users: {
      view: true,
      create: false,
      edit: "self-password-only",
      delete: false,
      recover: false,
    },
    dashboard: {
      view: true,
      edit: true,
    },
    settings: {
      view: true,
      edit: "self-only",
    },
    customers: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      export: true
    },
    offers: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: "assigned-only",
      export: true
    },
    tasks: {
      view: true,
      create: true,
      edit: "assigned-only",
      delete: false
    }
  },
  [UserRole.User]: {
    users: {
      view: "self-only",
      create: false,
      edit: "self-password-department-status-only",
      delete: false,
      recover: false,
    },
    dashboard: {
      view: true,
      edit: "assigned-only",
    },
    settings: {
      view: "self-only",
      edit: "self-password-department-status-only",
    },
    customers: {
      view: true,
      create: true,
      edit: "assigned-only",
      delete: false
    },
    offers: {
      view: "assigned-only",
      create: true,
      edit: "assigned-only",
      delete: false
    },
    tasks: {
      view: "assigned-only",
      create: true,
      edit: "assigned-only",
      delete: false
    }
  },
  [UserRole.ReadOnly]: {
    users: {
      view: "self-only",
      create: false,
      edit: "self-password-department-status-only",
      delete: false,
      recover: false,
    },
    dashboard: {
      view: true,
      edit: false,
    },
    settings: {
      view: "self-only",
      edit: "self-password-department-status-only",
    },
    customers: {
      view: true,
      create: false,
      edit: false,
      delete: false
    },
    offers: {
      view: true,
      create: false,
      edit: false,
      delete: false
    },
    tasks: {
      view: true,
      create: false,
      edit: false,
      delete: false
    }
  },
};

/**
 * Checks if a user has permission to perform an action on a module
 * 
 * @param userRole - Role of the current user
 * @param module - Application module being accessed
 * @param action - Action being attempted
 * @param targetUserId - ID of the user being acted upon (if applicable)
 * @param currentUserId - ID of the current user
 * @param teamIds - IDs of teams the current user belongs to (if applicable)
 * @param assignedToUserId - ID of the user an item is assigned to (if applicable) 
 * @returns Whether the user has permission
 */
export function checkPermission(
  userRole: UserRole | string,
  module: Module | keyof RolePermissions,
  action: Action | keyof ModulePermissions,
  options?: {
    targetUserId?: string;
    currentUserId?: string;
    teamIds?: string[];
    assignedToUserId?: string;
  }
): boolean {
  const { targetUserId, currentUserId, teamIds, assignedToUserId } = options || {};
  
  // Get the permission value for this role, module, and action
  const permission = permissions[userRole as UserRole]?.[module as keyof RolePermissions]?.[action as keyof ModulePermissions];

  // If permission isn't defined, no access
  if (permission === undefined) {
    return false;
  }

  // If permission is boolean, that's the answer
  if (typeof permission === "boolean") {
    return permission;
  }

  // For complex permissions, we need IDs
  if (!currentUserId) {
    return false;
  }

  // Handle special permission types
  switch (permission) {
    case "self-only":
      return targetUserId === currentUserId;
      
    case "self-password-only":
    case "self-password-department-status-only":
      return targetUserId === currentUserId;
      
    case "assigned-only":
      // Check if item is assigned to current user
      return assignedToUserId === currentUserId;
      
    case "team-only":
      // Check if item is assigned to someone in user's team
      return teamIds?.includes(assignedToUserId || '') || false;
      
    default:
      return false;
  }
}

/**
 * Creates a React component that is only rendered if the user has permission
 * 
 * @param userRole - Role of the current user
 * @param module - Application module being accessed
 * @param action - Action being attempted
 * @param options - Additional permission context
 * @returns HOC that wraps components requiring permission
 */
export function withPermission(
  userRole: UserRole | string,
  module: Module | keyof RolePermissions,
  action: Action | keyof ModulePermissions,
  options?: Parameters<typeof checkPermission>[3]
) {
  return function PermissionWrapper<P extends object>(
    Component: React.ComponentType<P>
  ): React.FC<P> {
    return function PermissionComponent(props: P) {
      const hasPermission = checkPermission(userRole, module, action, options);
      
      return hasPermission ? React.createElement(Component, props) : null;
    };
  };
}
