// Form utility functions for the offers dialog

// Date formatting utility functions
export const dateFormatUtils = {
  // Format current date and time in ISO format for datetime-local input
  formatCurrentDateTime: (date?: string) => {
    try {
      const now = date ? new Date(date) : new Date();
      now.setMilliseconds(0); // Reset milliseconds for consistency
      
      // First return a proper ISO string for the database
      return now.toISOString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return new Date().toISOString();
    }
  },
  
  // Format date for display
  formatDateDisplay: (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("el-GR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) + " " + date.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return "";
    }
  }
};

// Option Mappers
export const createOptionMappers = (options: Array<{value: string, label: string}>) => {
  return {
    getLabel: (value: string) => options.find(option => option.value === value)?.label || value,
    getValue: (label: string) => options.find(option => option.label === label)?.value || label
  };
};

// Source helpers
export const getSourceLabel = (value: string) => {
  switch (value) {
    case "Email":
      return "Email";
    case "Phone":
    case "Telephone":
      return "Τηλέφωνο";
    case "Website":
    case "Site":
      return "Ιστοσελίδα";
    case "In Person":
    case "Physical":
      return "Φυσική παρουσία";
    default:
      return value;
  }
};

export const getSourceValue = (label: string) => {
  switch (label) {
    case "Email":
      return "Email";
    case "Τηλέφωνο":
      return "Phone";
    case "Ιστοσελίδα":
    case "Site":
      return "Site";
    case "Φυσική παρουσία":
    case "Φυσική Παρουσία":
      return "Physical";
    default:
      return label;
  }
};

// Normalize source value
export const normalizeSourceValue = (source: string | null): string => {
  if (!source) return "Email";
  switch (source) {
    case "Email": return "Email";
    case "Phone": return "Phone";
    case "Site": return "Site";
    case "Physical": return "Physical";
    case "Τηλέφωνο": return "Phone";
    case "Ιστοσελίδα": return "Site";
    case "Φυσική παρουσία": return "Physical";
    case "Φυσική Παρουσία": return "Physical";
    default: 
      console.warn(` Unknown source value: "${source}". Defaulting to "Email".`);
      return "Email";
  }
};

// Form validation
export const formValidationUtils = (getValues: () => any, setError: (name: string, error: any) => void, setErrorMessage: (msg: string) => void) => {
  return {
    isFormValid: () => {
      const values = getValues();
      let isValid = true;

      // Check if amount is a valid number
      if (values.amount && !/^\d+(\.\d{1,2})?$/.test(values.amount)) {
        setError("amount", {
          type: "manual",
          message: "Το ποσό πρέπει να είναι έγκυρος αριθμός"
        });
        isValid = false;
      } else {
        setError("amount", {
          type: "manual",
          message: ""
        });
      }

      // Clear error message if form is valid
      if (isValid) {
        setErrorMessage("");
      }

      return isValid;
    },
    normalizeAmount: (amount: any): string => {
      if (!amount) return '';
      return String(amount);
    }
  };
};

// Tooltips and dialog cleanup
export const cleanupTooltipsAndPortals = () => {
  try {
    // Find any tooltip portals in the DOM and remove them manually
    document.querySelectorAll('[data-radix-tooltip-portal]').forEach(portal => {
      try {
        if (portal.parentNode) {
          portal.parentNode.removeChild(portal);
        }
      } catch (e) {
        // Silent cleanup error
      }
    });
    
    // Make sure tooltips mounted refs are set to true
    document.querySelectorAll('[data-tooltip-mounted]').forEach(el => {
      try {
        if ((el as any).tooltipMountedRef) {
          (el as any).tooltipMountedRef.current = true;
        }
      } catch (e) {
        // Silent cleanup error
      }
    });
  } catch (e) {
    // Ignore any errors in cleanup
  }
};

// Initialize tooltips
export const initializeTooltips = () => {
  // Initialize tooltips by ensuring all tooltip refs are set to mounted
  setTimeout(() => {
    document.querySelectorAll('[data-tooltip-mounted]').forEach(el => {
      try {
        if ((el as any).tooltipMountedRef) {
          (el as any).tooltipMountedRef.current = true;
        }
      } catch (e) {
        // Silent error
      }
    });
  }, 100);
}; 