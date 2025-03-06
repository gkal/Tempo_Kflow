type Permission =
  | boolean
  | "self-only"
  | "self-password-only"
  | "self-password-department-status-only"
  | "assigned-only";

interface ModulePermissions {
  view: Permission;
  edit?: Permission;
  create?: Permission;
  delete?: Permission;
  recover?: Permission;
}

interface RolePermissions {
  users: ModulePermissions;
  dashboard: ModulePermissions;
  settings: ModulePermissions;
}

const permissions: Record<string, RolePermissions> = {
  Admin: {
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
  },
  "Super User": {
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
  },
  User: {
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
  },
  "Μόνο ανάγνωση": {
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
  },
};

export function checkPermission(
  userRole: string,
  module: keyof RolePermissions,
  action: keyof ModulePermissions,
  targetUserId?: string,
  currentUserId?: string,
): boolean {
  const permission = permissions[userRole]?.[module]?.[action];

  if (typeof permission === "boolean") {
    return permission;
  }

  if (!targetUserId || !currentUserId) {
    return false;
  }

  switch (permission) {
    case "self-only":
      return targetUserId === currentUserId;
    case "self-password-only":
      return targetUserId === currentUserId;
    case "self-password-department-status-only":
      return targetUserId === currentUserId;
    case "assigned-only":
      // Implement your logic for assigned items
      return true;
    default:
      return false;
  }
}
