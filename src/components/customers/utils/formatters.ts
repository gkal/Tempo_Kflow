/**
 * Utility functions for formatting values in customers and offers components
 */

import { format } from "date-fns";

/**
 * Format currency values
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (!value && value !== 0) return "—";
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

/**
 * Format dates without time
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  
  try {
    return format(new Date(dateString), "dd/MM/yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "—";
  }
};

/**
 * Format dates with time
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "—";
  }
};

/**
 * Format offer status for display
 */
export const formatStatus = (status: string): string => {
  if (!status) return "—";
  
  const statusMap: Record<string, string> = {
    new: "Νέα",
    pending: "Σε εξέλιξη",
    completed: "Ολοκληρωμένη",
    invoiced: "Τιμολογημένη",
    expired: "Ληγμένη",
    rejected: "Απορριφθείσα",
    approved: "Εγκεκριμένη",
    wait_for_our_answer: "Αναμονή για απάντησή μας",
    wait_for_customer_answer: "Αναμονή για απάντηση πελάτη",
    ready: "Ολοκληρώθηκε"
  };
  
  return statusMap[status.toLowerCase()] || status;
};

/**
 * Format offer result for display
 */
export const formatResult = (result: string): string => {
  if (!result) return "—";
  
  const resultMap: Record<string, string> = {
    none: "—",
    pending: "Σε αναμονή",
    accepted: "Αποδοχή",
    rejected: "Απόρριψη",
    cancelled: "Ακύρωση",
    won: "Κερδισμένη",
    lost: "Χαμένη",
    success: "Επιτυχία",
    failed: "Αποτυχία",
    cancel: "Ακύρωση",
    waiting: "Αναμονή"
  };
  
  return resultMap[result.toLowerCase()] || result;
};

/**
 * Format source for display
 */
export const formatSource = (source: string): string => {
  if (!source) return "—";
  
  const sourceMap: Record<string, string> = {
    phone: "Τηλέφωνο",
    email: "Email",
    site: "Ιστοσελίδα",
    physical: "Φυσική παρουσία",
    personal: "Προσωπική επαφή",
    other: "Άλλο"
  };
  
  return sourceMap[source.toLowerCase()] || source;
};

/**
 * Get CSS class for status
 */
export const getStatusClass = (status: string): string => {
  if (!status) return "text-gray-400";
  
  const statusClassMap: Record<string, string> = {
    new: "text-blue-400",
    pending: "text-yellow-400",
    completed: "text-green-400",
    invoiced: "text-purple-400",
    expired: "text-red-400",
    rejected: "text-red-500",
    approved: "text-green-500",
    wait_for_our_answer: "text-yellow-400",
    wait_for_customer_answer: "text-blue-400",
    ready: "text-green-400"
  };
  
  return statusClassMap[status.toLowerCase()] || "text-gray-400";
};

/**
 * Get CSS class for result
 */
export const getResultClass = (result: string): string => {
  if (!result) return "text-gray-400";
  
  const resultClassMap: Record<string, string> = {
    none: "text-gray-400",
    pending: "text-yellow-400",
    accepted: "text-green-400",
    rejected: "text-red-400",
    cancelled: "text-gray-500",
    won: "text-green-500",
    lost: "text-red-500",
    success: "text-green-400",
    failed: "text-red-400",
    cancel: "text-yellow-400",
    waiting: "text-purple-400"
  };
  
  return resultClassMap[result.toLowerCase()] || "text-gray-400";
}; 