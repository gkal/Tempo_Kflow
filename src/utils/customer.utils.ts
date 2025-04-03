// Helper function for formatting currency
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

// Helper function for formatting dates
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

// Format date with time
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

// Format status for display
export const formatStatus = (status: string) => {
  switch (status) {
    case "wait_for_our_answer":
      return "Αναμονή για απάντησή μας";
    case "wait_for_customer_answer":
      return "Αναμονή για απάντηση πελάτη";
    case "ready":
      return "Ολοκληρώθηκε";
    default:
      return status || "—";
  }
};

// Format result for display
export const formatResult = (result: string) => {
  switch (result) {
    case "success":
      return "Επιτυχία";
    case "failed":
      return "Αποτυχία";
    case "cancel":
      return "Ακύρωση";
    case "waiting":
      return "Αναμονή";
    case "none":
      return "Κανένα";
    default:
      return result || "—";
  }
};

// Function to get status class
export const getStatusClass = (status: string): string => {
  switch (status) {
    case "wait_for_our_answer":
      return "text-yellow-400";
    case "wait_for_customer_answer":
      return "text-blue-400";
    case "ready":
      return "text-green-400";
    case "completed":
      return "text-green-400";
    case "pending":
      return "text-yellow-400";
    default:
      return "text-gray-400";
  }
};

// Function to get result class
export const getResultClass = (result: string): string => {
  switch (result) {
    case "success":
      return "text-green-400";
    case "failed":
      return "text-red-400";
    case "cancel":
      return "text-yellow-400";
    case "waiting":
      return "text-purple-400";
    case "pending":
      return "text-blue-400";
    case "none":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}; 