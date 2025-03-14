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
    date: "2025-02-20", // Previous date
    description: "Customer Management Enhancements",
    changes: [
      "Improved customer status toggle with optimized UI updates",
      "Fixed customer deletion process to properly handle foreign key constraints",
      "Enhanced edit form with better save/cancel functionality",
      "Removed redundant edit button from customer list",
      "Optimized table updates to avoid full refreshes when toggling status"
    ]
  },
  {
    version: "1.4.0",
    date: new Date().toISOString().split('T')[0], // Today's date
    description: "Σύστημα Διαχείρισης Προσφορών",
    changes: [
      "Προσθήκη νέας λειτουργίας Προσφορών για την παρακολούθηση προσφορών πελατών",
      "Υλοποίηση αλληλεπίδρασης με δεξί κλικ για πρόσβαση στις Προσφορές από τη λίστα πελατών",
      "Δημιουργία ειδικής διεπαφής διαχείρισης Προσφορών με παρακολούθηση κατάστασης",
      "Προσθήκη δυνατότητας ανάθεσης Προσφορών σε συγκεκριμένους χρήστες",
      "Ενσωμάτωση παρακολούθησης πηγής για εισερχόμενα αιτήματα"
    ]
  },
  {
    version: "1.5.0",
    date: new Date().toISOString().split('T')[0], // Today's date
    description: "Βελτιώσεις Συστήματος Προσφορών",
    changes: [
      "Προσθήκη λειτουργίας πραγματικού χρόνου για αυτόματη ενημέρωση προσφορών",
      "Βελτιστοποίηση απόδοσης με έξυπνη διαχείριση δεδομένων",
      "Προσθήκη φίλτρων για κατάσταση και αποτέλεσμα προσφορών",
      "Βελτίωση διεπαφής χρήστη με καλύτερη οργάνωση πληροφοριών",
      "Διόρθωση προβλήματος άπειρου βρόχου στις ενημερώσεις πραγματικού χρόνου"
    ]
  }
];

// Current version is the last entry in the version history
export const VERSION = VERSION_HISTORY[VERSION_HISTORY.length - 1].version;
