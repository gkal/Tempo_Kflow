/**
 * Application version management system
 * Provides structured version history and current version information
 */

/**
 * Version entry interface with semantic versioning support
 */
export interface VersionEntry {
  version: string;      // Semantic version (x.y.z)
  date: string;         // Release date in DD-MM-YYYY format
  description: string;  // Short description of the version
  changes: string[];    // List of changes in this version
  isPreRelease?: boolean; // Whether this is a pre-release version
  buildNumber?: number;   // Optional build number for CI/CD
}

/**
 * Semantic version components
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
  buildMetadata?: string;
}

/**
 * Parse a semantic version string into its components
 * @param version Semantic version string (e.g., "1.2.3-beta.1+build.123")
 * @returns Parsed semantic version object
 */
export function parseVersion(version: string): SemanticVersion {
  // Match semantic versioning pattern major.minor.patch[-prerelease][+buildmetadata]
  const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  const match = version.match(regex);
  
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    preRelease: match[4],
    buildMetadata: match[5]
  };
}

/**
 * Format a Date object to DD-MM-YYYY format
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatReleaseDate(date: Date): string {
  return date.toLocaleDateString('en-GB').split('/').join('-');
}

/**
 * Version history with structured format
 * Most recent versions should be at the beginning of the array
 */
export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: "1.5.3",
    date: formatReleaseDate(new Date()),
    description: "Φίλτρο Τύπων Πελατών",
    changes: [
      "Προσθήκη φίλτρου για την εμφάνιση πελατών με βάση τον τύπο τους",
      "Δυνατότητα πολλαπλής επιλογής τύπων πελατών με checkbox",
      "Ενσωμάτωση φίλτρου τύπων δίπλα στην αναζήτηση πελατών"
    ]
  },
  {
    version: "1.5.2",
    date: formatReleaseDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // 1 week ago
    description: "Επέκταση Τύπων Πελατών",
    changes: [
      "Προσθήκη νέων τύπων πελατών: Εκτακτος πελάτης και Εκτακτη εταιρία",
      "Ενημέρωση διεπαφής φόρμας πελάτη με τους νέους τύπους"
    ]
  },
  {
    version: "1.5.1",
    date: "16-03-2025",
    description: "Βελτιωμένο Σύστημα Προσφορών με Απλοποιημένη Διαχείριση Λεπτομερειών",
    changes: [
      "Δημιουργία πινάκων καταχώρησης πιθανών εργασιών",
      "Νέο μενού για την πλοήγηση στις εργασίες",
      "Πλήρης αναδιάρθρωση του συστήματος διαχείρισης λεπτομερειών προσφορών",
      "Αποτροπή αυτόματης αποθήκευσης στη βάση δεδομένων πριν την τελική υποβολή",
      "Βελτιστοποίηση της διαδικασίας αποθήκευσης για αποφυγή σφαλμάτων",
      "Απλοποίηση του κώδικα για καλύτερη συντηρησιμότητα και απόδοση"
    ]
  },
  {
    version: "1.5.0",
    date: "09-03-2025",
    description: "Βελτιώσεις Συστήματος Προσφορών",
    changes: [
      "Προσθήκη λειτουργίας πραγματικού χρόνου για αυτόματη ενημέρωση προσφορών",
      "Βελτιστοποίηση απόδοσης με έξυπνη διαχείριση δεδομένων",
      "Προσθήκη φίλτρων για κατάσταση και αποτέλεσμα προσφορών",
      "Βελτίωση διεπαφής χρήστη με καλύτερη οργάνωση πληροφοριών",
      "Διόρθωση προβλήματος άπειρου βρόχου στις ενημερώσεις πραγματικού χρόνου"
    ]
  },
  {
    version: "1.4.0",
    date: "02-03-2025",
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
    version: "1.3.0",
    date: "20-02-2025",
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
    version: "1.2.0",
    date: "15-01-2025",
    description: "UI Improvements and Bug Fixes",
    changes: [
      "Fixed DataTable loading state to show proper animation",
      "Fixed user role comparison in CustomerDetailPage",
      "Added automatic version logging system"
    ]
  },
  {
    version: "1.1.1",
    date: "10-12-2025",
    description: "Customer Type Enhancement",
    changes: [
      "Added customer_type field with values: Ιδιώτης, Εταιρεία, Δημόσιο"
    ]
  },
  {
    version: "1.1.0",
    date: "15-11-2025",
    description: "Customer and Contact Management",
    changes: [
      "Added Customers and Contacts tables with relationship",
      "Included user tracking fields and notes",
      "Added status field with active/inactive values to Customers and Contacts tables"
    ]
  },
  {
    version: "1.0.1",
    date: "01-10-2025",
    description: "Initial release",
    changes: [
      "Basic application structure",
      "User authentication",
      "Dashboard layout"
    ]
  }
];

// Current version is the first (most recent) entry in the version history
export const CURRENT_VERSION = VERSION_HISTORY[0];

// Export just the version string for simple imports
export const VERSION = CURRENT_VERSION.version;

/**
 * Gets a specific version entry by version string
 * @param version Version string to find
 * @returns Version entry or undefined if not found
 */
export function getVersionEntry(version: string): VersionEntry | undefined {
  return VERSION_HISTORY.find(entry => entry.version === version);
}

/**
 * Gets all versions released after a specific version
 * @param version Base version to compare against
 * @returns Array of newer version entries
 */
export function getNewerVersions(version: string): VersionEntry[] {
  const versionIndex = VERSION_HISTORY.findIndex(entry => entry.version === version);
  if (versionIndex === -1) return VERSION_HISTORY;
  return VERSION_HISTORY.slice(0, versionIndex);
}
