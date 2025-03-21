// Version history with structured format
export interface VersionEntry {
  version: string;
  date: string;
  description: string;
  changes: string[];
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: "1.5.3",
    date: new Date().toLocaleDateString('en-GB').split('/').join('-'),
    description: "Φίλτρο Τύπων Πελατών",
    changes: [
      "Προσθήκη φίλτρου για την εμφάνιση πελατών με βάση τον τύπο τους",
      "Δυνατότητα πολλαπλής επιλογής τύπων πελατών με checkbox",
      "Ενσωμάτωση φίλτρου τύπων δίπλα στην αναζήτηση πελατών"
    ]
  },
  {
    version: "1.5.2",
    date: new Date().toLocaleDateString('en-GB').split('/').join('-'),
    description: "Επέκταση Τύπων Πελατών",
    changes: [
      "Προσθήκη νέων τύπων πελατών: Εκτακτος Πελάτης και Εκτακτη Εταιρία",
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

// Current version is the first entry in the version history
export const VERSION = VERSION_HISTORY[0].version;
