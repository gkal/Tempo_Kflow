// Version history with structured format
export interface VersionEntry {
  version: string;
  date: string;
  description: string;
  changes: string[];
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: "1.0.1",
    date: "2025-10-01", // Estimated date
    description: "Initial release",
    changes: [
      "Basic application structure",
      "User authentication",
      "Dashboard layout"
    ]
  },
  {
    version: "1.1.0",
    date: "2025-11-15", // Estimated date
    description: "Customer and Contact Management",
    changes: [
      "Added Customers and Contacts tables with relationship",
      "Included user tracking fields and notes",
      "Added status field with active/inactive values to Customers and Contacts tables"
    ]
  },
  {
    version: "1.1.1",
    date: "2025-12-10", // Estimated date
    description: "Customer Type Enhancement",
    changes: [
      "Added customer_type field with values: Ιδιώτης, Εταιρεία, Δημόσιο"
    ]
  },
  {
    version: "1.2.0",
    date: "2025-01-15", // Previous date
    description: "UI Improvements and Bug Fixes",
    changes: [
      "Fixed DataTable loading state to show proper animation",
      "Fixed user role comparison in CustomerDetailPage",
      "Added automatic version logging system"
    ]
  },
  {
    version: "1.3.0",
    date: new Date().toISOString().split('T')[0], // Today's date
    description: "Customer Management Enhancements",
    changes: [
      "Improved customer status toggle with optimized UI updates",
      "Fixed customer deletion process to properly handle foreign key constraints",
      "Enhanced edit form with better save/cancel functionality",
      "Removed redundant edit button from customer list",
      "Optimized table updates to avoid full refreshes when toggling status"
    ]
  }
];

// Current version is the last entry in the version history
export const VERSION = VERSION_HISTORY[VERSION_HISTORY.length - 1].version;
