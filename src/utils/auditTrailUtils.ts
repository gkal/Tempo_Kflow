import { AuditActionType, AuditSeverity } from '@/services/auditTrailService';

/**
 * Map of audit action types to Greek labels
 */
export const actionTypeLabels: Record<AuditActionType, string> = {
  [AuditActionType.USER_LOGIN]: 'Σύνδεση Χρήστη',
  [AuditActionType.USER_LOGOUT]: 'Αποσύνδεση Χρήστη',
  [AuditActionType.USER_CREATED]: 'Δημιουργία Χρήστη',
  [AuditActionType.USER_UPDATED]: 'Ενημέρωση Χρήστη',
  [AuditActionType.USER_DELETED]: 'Διαγραφή Χρήστη',
  [AuditActionType.USER_ROLE_CHANGED]: 'Αλλαγή Ρόλου Χρήστη',
  
  [AuditActionType.FORM_CREATED]: 'Δημιουργία Φόρμας',
  [AuditActionType.FORM_UPDATED]: 'Ενημέρωση Φόρμας',
  [AuditActionType.FORM_DELETED]: 'Διαγραφή Φόρμας',
  [AuditActionType.FORM_VIEWED]: 'Προβολή Φόρμας',
  [AuditActionType.FORM_SUBMITTED]: 'Υποβολή Φόρμας',
  [AuditActionType.FORM_LINK_CREATED]: 'Δημιουργία Συνδέσμου Φόρμας',
  [AuditActionType.FORM_LINK_SENT]: 'Αποστολή Συνδέσμου Φόρμας',
  [AuditActionType.FORM_LINK_EXPIRED]: 'Λήξη Συνδέσμου Φόρμας',
  [AuditActionType.FORM_TEMPLATE_MODIFIED]: 'Τροποποίηση Προτύπου Φόρμας',
  [AuditActionType.FORM_FIELD_ADDED]: 'Προσθήκη Πεδίου Φόρμας',
  [AuditActionType.FORM_FIELD_UPDATED]: 'Ενημέρωση Πεδίου Φόρμας',
  [AuditActionType.FORM_FIELD_REMOVED]: 'Αφαίρεση Πεδίου Φόρμας',
  [AuditActionType.FORM_VALIDATION_MODIFIED]: 'Τροποποίηση Κανόνων Επικύρωσης Φόρμας',
  
  [AuditActionType.APPROVAL_REQUESTED]: 'Αίτημα Έγκρισης',
  [AuditActionType.FORM_APPROVED]: 'Έγκριση Φόρμας',
  [AuditActionType.FORM_REJECTED]: 'Απόρριψη Φόρμας',
  [AuditActionType.APPROVAL_REMINDER_SENT]: 'Αποστολή Υπενθύμισης Έγκρισης',
  [AuditActionType.APPROVAL_NOTIFICATION_SENT]: 'Αποστολή Ειδοποίησης Έγκρισης',
  
  [AuditActionType.OFFER_CREATED_FROM_FORM]: 'Δημιουργία Προσφοράς από Φόρμα',
  [AuditActionType.OFFER_UPDATED]: 'Ενημέρωση Προσφοράς',
  [AuditActionType.OFFER_DELETED]: 'Διαγραφή Προσφοράς',
  
  [AuditActionType.CUSTOMER_CREATED]: 'Δημιουργία Πελάτη',
  [AuditActionType.CUSTOMER_UPDATED]: 'Ενημέρωση Πελάτη',
  [AuditActionType.CUSTOMER_DELETED]: 'Διαγραφή Πελάτη',
  
  [AuditActionType.CONFIG_UPDATED]: 'Ενημέρωση Ρυθμίσεων',
  [AuditActionType.SECURITY_SETTING_CHANGED]: 'Αλλαγή Ρυθμίσεων Ασφαλείας',
  [AuditActionType.EMAIL_TEMPLATE_MODIFIED]: 'Τροποποίηση Προτύπου Email',
  [AuditActionType.SYSTEM_PARAMETER_UPDATED]: 'Ενημέρωση Παραμέτρων Συστήματος',
  [AuditActionType.FEATURE_FLAG_CHANGED]: 'Αλλαγή Feature Flag',
  
  [AuditActionType.DATA_EXPORTED]: 'Εξαγωγή Δεδομένων',
  [AuditActionType.REPORT_GENERATED]: 'Δημιουργία Αναφοράς',
  
  [AuditActionType.SECURITY_ERROR]: 'Σφάλμα Ασφαλείας',
  [AuditActionType.VALIDATION_ERROR]: 'Σφάλμα Επικύρωσης',
  [AuditActionType.SYSTEM_ERROR]: 'Σφάλμα Συστήματος'
};

/**
 * Map of severity levels to Greek labels and colors
 */
export const severityLabels: Record<AuditSeverity, { label: string, color: string, bgColor: string, textColor: string }> = {
  [AuditSeverity.INFO]: { 
    label: 'Πληροφορία', 
    color: 'bg-blue-100 text-blue-800',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  [AuditSeverity.WARNING]: { 
    label: 'Προειδοποίηση', 
    color: 'bg-yellow-100 text-yellow-800',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700'
  },
  [AuditSeverity.ERROR]: { 
    label: 'Σφάλμα', 
    color: 'bg-red-100 text-red-800',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700'
  },
  [AuditSeverity.CRITICAL]: { 
    label: 'Κρίσιμο', 
    color: 'bg-red-200 text-red-900',
    bgColor: 'bg-red-100',
    textColor: 'text-red-900'
  }
};

/**
 * Common target types
 */
export const commonTargetTypes = [
  { value: 'form_link', label: 'Σύνδεσμος Φόρμας' },
  { value: 'form_template', label: 'Πρότυπο Φόρμας' },
  { value: 'customer', label: 'Πελάτης' },
  { value: 'offer', label: 'Προσφορά' },
  { value: 'user', label: 'Χρήστης' },
  { value: 'config', label: 'Ρυθμίσεις' },
  { value: 'email_template', label: 'Πρότυπο Email' }
];

/**
 * Common tags used in audit trails
 */
export const commonTags = [
  { value: 'security', label: 'Ασφάλεια' },
  { value: 'form', label: 'Φόρμα' },
  { value: 'user', label: 'Χρήστης' },
  { value: 'customer', label: 'Πελάτης' },
  { value: 'offer', label: 'Προσφορά' },
  { value: 'approval', label: 'Έγκριση' },
  { value: 'configuration', label: 'Ρυθμίσεις' },
  { value: 'export', label: 'Εξαγωγή' },
  { value: 'error', label: 'Σφάλμα' }
];

/**
 * Action type groups for organizing filters
 */
export const actionTypeGroups = [
  {
    label: 'Χρήστες',
    types: [
      AuditActionType.USER_LOGIN,
      AuditActionType.USER_LOGOUT,
      AuditActionType.USER_CREATED,
      AuditActionType.USER_UPDATED,
      AuditActionType.USER_DELETED,
      AuditActionType.USER_ROLE_CHANGED
    ]
  },
  {
    label: 'Φόρμες',
    types: [
      AuditActionType.FORM_CREATED,
      AuditActionType.FORM_UPDATED,
      AuditActionType.FORM_DELETED,
      AuditActionType.FORM_VIEWED,
      AuditActionType.FORM_SUBMITTED,
      AuditActionType.FORM_LINK_CREATED,
      AuditActionType.FORM_LINK_SENT,
      AuditActionType.FORM_LINK_EXPIRED,
      AuditActionType.FORM_TEMPLATE_MODIFIED,
      AuditActionType.FORM_FIELD_ADDED,
      AuditActionType.FORM_FIELD_UPDATED,
      AuditActionType.FORM_FIELD_REMOVED,
      AuditActionType.FORM_VALIDATION_MODIFIED
    ]
  },
  {
    label: 'Διαδικασία Έγκρισης',
    types: [
      AuditActionType.APPROVAL_REQUESTED,
      AuditActionType.FORM_APPROVED,
      AuditActionType.FORM_REJECTED,
      AuditActionType.APPROVAL_REMINDER_SENT,
      AuditActionType.APPROVAL_NOTIFICATION_SENT
    ]
  },
  {
    label: 'Προσφορές',
    types: [
      AuditActionType.OFFER_CREATED_FROM_FORM,
      AuditActionType.OFFER_UPDATED,
      AuditActionType.OFFER_DELETED
    ]
  },
  {
    label: 'Πελάτες',
    types: [
      AuditActionType.CUSTOMER_CREATED,
      AuditActionType.CUSTOMER_UPDATED,
      AuditActionType.CUSTOMER_DELETED
    ]
  },
  {
    label: 'Ρυθμίσεις Συστήματος',
    types: [
      AuditActionType.CONFIG_UPDATED,
      AuditActionType.SECURITY_SETTING_CHANGED,
      AuditActionType.EMAIL_TEMPLATE_MODIFIED,
      AuditActionType.SYSTEM_PARAMETER_UPDATED,
      AuditActionType.FEATURE_FLAG_CHANGED
    ]
  },
  {
    label: 'Εξαγωγή & Αναφορές',
    types: [
      AuditActionType.DATA_EXPORTED,
      AuditActionType.REPORT_GENERATED
    ]
  },
  {
    label: 'Σφάλματα',
    types: [
      AuditActionType.SECURITY_ERROR,
      AuditActionType.VALIDATION_ERROR,
      AuditActionType.SYSTEM_ERROR
    ]
  }
];

/**
 * Format a JSON object for display in the UI
 */
export function formatJsonForDisplay(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return JSON.stringify({ error: 'Σφάλμα μορφοποίησης δεδομένων' });
  }
}

/**
 * Get the color class for a severity level
 */
export function getSeverityColorClass(severity: AuditSeverity): string {
  return severityLabels[severity]?.color || 'bg-gray-100 text-gray-800';
}

/**
 * Group audit trails by date for timeline display
 */
export function groupAuditTrailsByDate(trails: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  trails.forEach(trail => {
    const date = new Date(trail.timestamp).toLocaleDateString('el-GR');
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(trail);
  });
  
  return grouped;
}

/**
 * Get label for a target type
 */
export function getTargetTypeLabel(targetType: string | null): string {
  if (!targetType) return 'Άγνωστο';
  
  const targetTypeObj = commonTargetTypes.find(t => t.value === targetType);
  return targetTypeObj ? targetTypeObj.label : targetType;
}

/**
 * Determine if a target is viewable
 */
export function isTargetViewable(targetType: string | null): boolean {
  if (!targetType) return false;
  
  const viewableTypes = ['customer', 'offer', 'form_link', 'user'];
  return viewableTypes.includes(targetType);
}

/**
 * Get the route for viewing a target
 */
export function getTargetViewRoute(targetType: string, targetId: string): string {
  switch (targetType) {
    case 'customer':
      return `/customers/${targetId}`;
    case 'offer':
      return `/offers/${targetId}`;
    case 'form_link':
      return `/form-links/${targetId}`;
    case 'user':
      return `/users/${targetId}`;
    default:
      return '#';
  }
}

/**
 * Format timestamp with Greek locale
 */
export function formatTimestamp(timestamp: string, format = 'PPpp'): string {
  try {
    const date = new Date(timestamp);
    const formatter = new Intl.DateTimeFormat('el-GR', {
      dateStyle: 'full',
      timeStyle: 'medium'
    });
    return formatter.format(date);
  } catch (error) {
    return timestamp;
  }
} 