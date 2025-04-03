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
export const formatDateTime = (dateString?: string): string => {
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
export const formatStatus = (status: string): string => {
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
export const formatResult = (result: string): string => {
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