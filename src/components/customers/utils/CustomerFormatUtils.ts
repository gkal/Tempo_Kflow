// Formatting utility functions for customer data
// Extracted from CustomersPage.tsx to improve modularity

/**
 * Formats a number as currency in EUR using Greek locale
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

/**
 * Formats a date string to Greek locale format
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    return '-';
  }
};

/**
 * Formats a date with time in Greek locale format
 */
export const formatDateTime = (dateString?: string) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    return dateString;
  }
};

/**
 * Formats status for display with appropriate translation
 */
export const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'active': 'Ενεργός',
    'inactive': 'Ανενεργός',
    'pending': 'Σε αναμονή',
    'completed': 'Ολοκληρωμένη',
    'in_progress': 'Σε εξέλιξη',
    'cancelled': 'Ακυρωμένη'
  };
  
  return statusMap[status] || status;
};

/**
 * Formats result for display with appropriate translation
 */
export const formatResult = (result: string) => {
  const resultMap: Record<string, string> = {
    'won': 'Επιτυχής',
    'lost': 'Αποτυχημένη',
    'pending': 'Σε αναμονή',
    'cancelled': 'Ακυρωμένη'
  };
  
  return resultMap[result] || result;
};

/**
 * Returns CSS class based on status
 */
export const getStatusClass = (status: string): string => {
  const statusClassMap: Record<string, string> = {
    'active': 'bg-green-100 text-green-800',
    'inactive': 'bg-gray-100 text-gray-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-purple-100 text-purple-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  
  return statusClassMap[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Returns CSS class based on result
 */
export const getResultClass = (result: string): string => {
  const resultClassMap: Record<string, string> = {
    'won': 'bg-green-100 text-green-800',
    'lost': 'bg-red-100 text-red-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  };
  
  return resultClassMap[result] || 'bg-gray-100 text-gray-800';
};
