import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Undo2, Trash2, AlertCircle, User, Building, FileText, CheckSquare, Phone, Check } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";

// Define the tables that have soft delete enabled
const TABLES_WITH_SOFT_DELETE = [
  { id: 'customers' as TableType, name: 'Πελάτες', icon: Building },
  { id: 'contacts' as TableType, name: 'Επαφές', icon: User },
  { id: 'offers' as TableType, name: 'Προσφορές', icon: FileText },
  { id: 'offer_details' as TableType, name: 'Λεπτομέρειες Προσφορών', icon: FileText },
  { id: 'tasks' as TableType, name: 'Εργασίες', icon: CheckSquare },
  { id: 'users' as TableType, name: 'Χρήστες', icon: User }
];

// Type for deleted records
type DeletedRecord = {
  id: string;
  deleted_at: string;
  record: any;
};

// Define a type for table IDs to fix type errors
type TableType = 'customers' | 'contacts' | 'offers' | 'offer_details' | 'tasks' | 'users';

// Helper function to get a readable title for a record
const getRecordTitle = (record: any, tableType: string): string => {
  switch (tableType) {
    case 'customers':
      return record.company_name || 'Άγνωστος Πελάτης';
    case 'contacts':
      return record.full_name || 'Άγνωστη Επαφή';
    case 'offers':
      return `Προσφορά: ${record.amount || 'Άγνωστο ποσό'} - ${record.title || ''}`;
    case 'offer_details':
      return `Λεπτομέρεια: ${record.description?.substring(0, 30) || 'Χωρίς περιγραφή'}${record.description?.length > 30 ? '...' : ''}`;
    case 'tasks':
      return record.title || 'Άγνωστη Εργασία';
    case 'users':
      return record.fullname || record.username || 'Άγνωστος Χρήστης';
    default:
      return 'Άγνωστη Εγγραφή';
  }
};

// Helper function to get key details for a record based on its type
const getRecordDetails = (record: any, tableType: string): React.ReactNode => {
  switch (tableType) {
    case 'customers':
      return (
        <span className="space-y-2 block">
          {record.afm && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">ΑΦΜ:</span>
              <span>{record.afm}</span>
            </span>
          )}
          {record.telephone && (
            <span className="flex items-center block">
              <Phone className="h-3 w-3 mr-2 text-[#84a98c]" />
              <span>{record.telephone}</span>
            </span>
          )}
          {record.email && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">Email:</span>
              <span>{record.email}</span>
            </span>
          )}
          {record.address && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">Διεύθυνση:</span>
              <span>{record.address}</span>
            </span>
          )}
        </span>
      );
    case 'contacts':
      return (
        <span className="space-y-2 block">
          {record.position && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">Θέση:</span>
              <span>{record.position}</span>
            </span>
          )}
          {record.phone && (
            <span className="flex items-center block">
              <Phone className="h-3 w-3 mr-2 text-[#84a98c]" />
              <span>{record.phone}</span>
            </span>
          )}
          {record.email && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">Email:</span>
              <span>{record.email}</span>
            </span>
          )}
          {record.customer_id && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">Πελάτης:</span>
              <CustomerName customerId={record.customer_id} />
            </span>
          )}
        </span>
      );
    case 'offers':
      return (
        <span className="space-y-2 block">
          {record.requirements && (
            <span className="flex items-start block">
              <span className="text-[#84a98c] text-xs mr-2">Απαιτήσεις:</span>
              <span className="text-sm">{record.requirements}</span>
            </span>
          )}
          {record.amount && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">Ποσό:</span>
              <span>{record.amount}</span>
            </span>
          )}
          {record.offer_result && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">Αποτέλεσμα:</span>
              <Badge variant="outline" className="text-xs">
                {record.offer_result}
              </Badge>
            </span>
          )}
          {record.customer_id && (
            <span className="flex items-center block">
              <span className="text-[#84a98c] text-xs mr-2">Πελάτης:</span>
              <CustomerName customerId={record.customer_id} />
            </span>
          )}
        </span>
      );
    case 'tasks':
      return (
        <div className="space-y-2">
          {record.description && (
            <div className="flex items-start">
              <span className="text-[#84a98c] text-xs mr-2">Περιγραφή:</span>
              <span className="text-sm">{record.description}</span>
            </div>
          )}
          {record.status && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Κατάσταση:</span>
              <Badge variant="outline" className="text-xs">
                {record.status}
              </Badge>
            </div>
          )}
          {record.due_date && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Προθεσμία:</span>
              <span>{formatDateTime(record.due_date)}</span>
            </div>
          )}
        </div>
      );
    case 'users':
      return (
        <div className="space-y-2">
          {record.username && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Username:</span>
              <span>{record.username}</span>
            </div>
          )}
          {record.email && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Email:</span>
              <span>{record.email}</span>
            </div>
          )}
          {record.role && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Ρόλος:</span>
              <Badge variant="outline" className="text-xs">
                {record.role}
              </Badge>
            </div>
          )}
        </div>
      );
    case 'offer_details':
      return (
        <div className="space-y-2">
          {record.description && (
            <div className="flex items-start">
              <span className="text-[#84a98c] text-xs mr-2">Περιγραφή:</span>
              <span className="text-sm">{record.description}</span>
            </div>
          )}
          {record.quantity && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Ποσότητα:</span>
              <span>{record.quantity}</span>
            </div>
          )}
          {record.unit_price && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Τιμή Μονάδας:</span>
              <span>{record.unit_price}</span>
            </div>
          )}
          {record.offer_id && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Προσφορά:</span>
              <OfferName offerId={record.offer_id} />
            </div>
          )}
        </div>
      );
    default:
      return (
        <div className="mt-2">
          <pre className="text-xs bg-[#2f3e46] p-2 rounded overflow-auto max-h-40 border border-[#52796f] text-[#cad2c5]">
            {JSON.stringify(record, null, 2)}
          </pre>
        </div>
      );
  }
};

// Component to display customer name instead of ID
function CustomerName({ customerId }: { customerId: string }) {
  const [customerName, setCustomerName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);
  
  useEffect(() => {
    const fetchCustomerName = async () => {
      try {
        setIsLoading(true);
        
        // First try to get non-deleted customer
        const { data, error } = await supabase
          .from('customers')
          .select('company_name, deleted_at')
          .eq('id', customerId)
          .single();
          
        if (data) {
          setCustomerName(data.company_name);
          setIsDeleted(data.deleted_at !== null);
        } else {
          // Customer doesn't exist at all
          setCustomerName(`ID: ${customerId}`);
          setIsDeleted(false);
        }
      } catch (error) {
        console.error('Error fetching customer name:', error);
        setCustomerName(`ID: ${customerId}`);
        setIsDeleted(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomerName();
  }, [customerId]);
  
  if (isLoading) {
    return (
      <div className="flex items-center">
        <svg className="animate-spin h-4 w-4 text-[#52796f] mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  if (isDeleted) {
    return <span className="text-xs text-amber-500">{customerName} [Διαγραμμένος]</span>;
  }
  
  return <span className="text-xs">{customerName}</span>;
}

// Component to display user name instead of ID
function UserName({ userId }: { userId: string }) {
  const [userName, setUserName] = useState<string>("");
  
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('fullname, username')
          .eq('id', userId)
          .is('deleted_at', null)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setUserName(data.fullname || data.username || userId);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName(userId);
      }
    };
    
    fetchUserName();
  }, [userId]);
  
  if (!userName) {
    return <span className="opacity-70">Άγνωστος Χρήστης</span>;
  }
  
  return <span>{userName}</span>;
}

// Component to display offer title instead of ID
function OfferName({ offerId }: { offerId: string }) {
  const [offerName, setOfferName] = useState<string>("");
  
  useEffect(() => {
    const fetchOfferName = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('title, amount')
          .eq('id', offerId)
          .is('deleted_at', null)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setOfferName(data.title || `Προσφορά: ${data.amount || ''}`);
        }
      } catch (error) {
        console.error('Error fetching offer name:', error);
        setOfferName(`ID: ${offerId}`);
      }
    };
    
    fetchOfferName();
  }, [offerId]);
  
  if (!offerName) {
    return (
      <div className="flex items-center">
        <svg className="animate-spin h-4 w-4 text-[#52796f] mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  return <span className="text-xs">{offerName}</span>;
}

// CSS styles to add at the top of the file, just after imports
const customStyles = `
  .scrollable-table-container {
    max-height: 60vh;
    overflow-y: auto;
    border-radius: 0.375rem;
    border: 1px solid #52796f;
    position: relative;
  }

  .scrollable-table-container table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  .scrollable-table-container th {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: #2f3e46;
    border-bottom: 1px solid #52796f;
  }

  .scrollable-table-container tbody tr {
    border-bottom: 1px solid #52796f;
  }

  .scrollable-table-container tbody tr:last-child {
    border-bottom: none;
  }
`;

// Add a type assertion function to help with TypeScript
const isActiveTab = (tab: TableType, value: TableType): boolean => {
  return tab === value;
};

export default function RecoveryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TableType>(TABLES_WITH_SOFT_DELETE[0].id as TableType);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [recordToRestore, setRecordToRestore] = useState<DeletedRecord | null>(null);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<any[]>([]);
  const [showBatchRestoreDialog, setShowBatchRestoreDialog] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRecordDetailsDialog, setShowRecordDetailsDialog] = useState(false);
  const [recordDetails, setRecordDetails] = useState<DeletedRecord | null>(null);
  const [relatedRecordsExist, setRelatedRecordsExist] = useState<{[key: string]: boolean}>({});
  const [isCheckingRelations, setIsCheckingRelations] = useState(false);
  const [isRestoringSuccessful, setIsRestoringSuccessful] = useState(false);
  const [recordName, setRecordName] = useState<string>("");

  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === "admin";

  // Reset selected records when changing tabs
  useEffect(() => {
    setSelectedRecords([]);
  }, [activeTab]);

  // Fetch deleted records for the active tab
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchDeletedRecords = async () => {
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .rpc('list_deleted_records', { table_name: activeTab });
          
        if (error) throw error;
        
        // Sort the records by deleted_at date, newest first
        const sortedData = data ? [...data].sort((a, b) => 
          new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
        ) : [];
        
        setDeletedRecords(sortedData);
      } catch (error) {
        console.error(`Error fetching deleted ${activeTab}:`, error);
        setDeletedRecords([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeletedRecords();
  }, [activeTab, isAdmin]);
  
  // Function to refresh the list of deleted records
  const refreshDeletedRecords = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .rpc('list_deleted_records', { table_name: activeTab });
        
      if (error) throw error;
      
      // Sort the records by deleted_at date, newest first
      const sortedData = data ? [...data].sort((a, b) => 
        new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      ) : [];
      
      setDeletedRecords(sortedData);
    } catch (error) {
      console.error(`Error refreshing deleted ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to open record details dialog
  const handleViewDetails = (record: DeletedRecord) => {
    setRecordDetails(record);
    setShowRecordDetailsDialog(true);
    
    // Check if related records exist when viewing an offer or contact
    if (activeTab === 'offers' || activeTab === 'contacts' || activeTab === 'offer_details') {
      checkRelatedRecords(record);
    }
  };
  
  // Function to check if related records exist
  const checkRelatedRecords = async (record: DeletedRecord) => {
    setIsCheckingRelations(true);
    const relations: {[key: string]: boolean} = {};
    
    try {
      if (isActiveTab(activeTab, 'offers') && record.record.customer_id) {
        // Check if customer exists
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', record.record.customer_id)
          .is('deleted_at', null)
          .single();
        
        relations.customer = !!customerData;
        
        // Also check offer_details
        const { data: detailsData, error: detailsError } = await supabase
          .from('offer_details')
          .select('id')
          .eq('offer_id', record.id)
          .limit(1);
        
        relations.offerDetails = detailsData && detailsData.length > 0;
      }
      
      if (isActiveTab(activeTab, 'contacts') && record.record.customer_id) {
        // Check if customer exists
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', record.record.customer_id)
          .is('deleted_at', null)
          .single();
        
        relations.customer = !!customerData;
      }
      
      if (isActiveTab(activeTab, 'offer_details') && record.record.offer_id) {
        // Check if offer exists
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .select('id')
          .eq('id', record.record.offer_id)
          .is('deleted_at', null)
          .single();
        
        relations.offer = !!offerData;
      }
      
      setRelatedRecordsExist(relations);
    } catch (error) {
      console.error('Error checking related records:', error);
      // Default to showing warnings
      if (isActiveTab(activeTab, 'offers') && record.record.customer_id) {
        relations.customer = false;
      } else if (isActiveTab(activeTab, 'contacts') && record.record.customer_id) {
        relations.customer = false;
      } else if (isActiveTab(activeTab, 'offer_details') && record.record.offer_id) {
        relations.offer = false;
      }
      setRelatedRecordsExist(relations);
    } finally {
      setIsCheckingRelations(false);
    }
  };
  
  // UI-friendly restore handler
  const handleRestoreWithUI = async () => {
    if (!recordToRestore) return;
    
    try {
      setIsRestoring(true);
      
      // Store the name for display in success message
      let recordName = getRecordTitle(recordToRestore.record, activeTab);
      setRecordName(recordName);
      
      console.log(`Starting restoration of ${activeTab} record:`, recordToRestore.record.id);
      
      // Special handling for offers to check if associated customer exists
      if (isActiveTab(activeTab, 'offers') && recordToRestore.record.customer_id) {
        console.log(`Checking associated customer: ${recordToRestore.record.customer_id}`);
        
        // Check if the customer exists (deleted or not)
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id, deleted_at')
          .eq('id', recordToRestore.record.customer_id)
          .single();
        
        console.log('Customer check result:', existingCustomer);
          
        // If customer exists but is deleted, restore it first
        if (existingCustomer && existingCustomer.deleted_at !== null) {
          console.log(`Restoring associated customer: ${existingCustomer.id}`);
          
          const { error: customerRestoreError } = await supabase
            .from('customers')
            .update({ deleted_at: null })
            .eq('id', recordToRestore.record.customer_id);
            
          if (customerRestoreError) {
            console.error("Error restoring associated customer:", customerRestoreError);
            throw new Error("Failed to restore associated customer");
          }

          // Log success
          console.log(`Successfully restored associated customer: ${existingCustomer.id}`);
          toast({
            title: "Επιτυχία",
            description: "Ο συσχετισμένος πελάτης ανακτήθηκε επιτυχώς",
            variant: "default",
          });
        }
      }
      
      // If offer_details, check if offer needs restoration
      if (isActiveTab(activeTab, 'offer_details') && recordToRestore.record.offer_id) {
        console.log(`Checking associated offer: ${recordToRestore.record.offer_id}`);
        
        // Check if the offer exists but is deleted
        const { data: existingOffer } = await supabase
          .from('offers')
          .select('id, deleted_at, customer_id')
          .eq('id', recordToRestore.record.offer_id)
          .single();
        
        console.log('Offer check result:', existingOffer);
          
        // If offer exists but is deleted, restore it too
        if (existingOffer && existingOffer.deleted_at !== null) {
          // First check if the customer associated with this offer is deleted
          if (existingOffer.customer_id) {
            console.log(`Checking customer of offer: ${existingOffer.customer_id}`);
            
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id, deleted_at')
              .eq('id', existingOffer.customer_id)
              .single();
            
            console.log('Customer of offer check result:', existingCustomer);
              
            // If customer exists but is deleted, restore it first
            if (existingCustomer && existingCustomer.deleted_at !== null) {
              console.log(`Restoring customer of offer: ${existingCustomer.id}`);
              
              const { error: customerRestoreError } = await supabase
                .from('customers')
                .update({ deleted_at: null })
                .eq('id', existingOffer.customer_id);
                
              if (customerRestoreError) {
                console.error("Error restoring associated customer:", customerRestoreError);
                throw new Error("Failed to restore associated customer");
              }

              // Log success
              console.log(`Successfully restored associated customer: ${existingCustomer.id}`);
              toast({
                title: "Επιτυχία",
                description: "Ο συσχετισμένος πελάτης ανακτήθηκε επιτυχώς",
                variant: "default",
              });
            }
          }

          // Now restore the offer
          console.log(`Restoring associated offer: ${existingOffer.id}`);
          
          const { error: offerRestoreError } = await supabase
            .from('offers')
            .update({ deleted_at: null })
            .eq('id', recordToRestore.record.offer_id);
            
          if (offerRestoreError) {
            console.error("Error restoring associated offer:", offerRestoreError);
            throw new Error("Failed to restore associated offer");
          }

          // Log success
          console.log(`Successfully restored associated offer: ${existingOffer.id}`);
          toast({
            title: "Επιτυχία",
            description: "Η συσχετισμένη προσφορά ανακτήθηκε επιτυχώς",
            variant: "default",
          });
        }
      }
      
      // Restore the main record
      console.log(`Restoring main ${activeTab} record: ${recordToRestore.record.id}`);
      
      const { error: restoreError } = await supabase
        .from(activeTab)
        .update({ deleted_at: null })
        .eq('id', recordToRestore.record.id);
        
      if (restoreError) {
        console.error("Error restoring main record:", restoreError);
        throw restoreError;
      }
      
      // If this is an offer, also restore any associated offer_details
      if (isActiveTab(activeTab, 'offers')) {
        // Restore any offer_details related to this offer
        console.log(`Restoring offer_details for offer: ${recordToRestore.record.id}`);
        
        const { error: detailsError } = await supabase
          .from('offer_details')
          .update({ deleted_at: null })
          .eq('offer_id', recordToRestore.record.id);
        
        if (detailsError) {
          console.warn('Could not restore related offer details:', detailsError);
        } else {
          console.log('Successfully restored offer details');
        }
      }
      
      // Only set successful after all operations complete
      console.log('Restoration complete');
      setIsRestoringSuccessful(true);
      setIsRestoring(false);
      
      // Refresh data
      refreshDeletedRecords();
    } catch (error) {
      console.error("Error during restoration:", error);
      
      // Show error toast
      toast({
        title: "Σφάλμα",
        description: "Προέκυψε σφάλμα κατά την ανάκτηση της εγγραφής",
        variant: "destructive",
      });
      
      // Reset dialog state
      setIsRestoring(false);
      setShowRestoreDialog(false);
      setRecordToRestore(null);
    }
  };

  // Handle batch restore with UI updates
  const handleBatchRestoreWithUI = async () => {
    if (selectedRecords.length === 0) return;
    
    try {
      setIsRestoring(true);
      
      // For each selected record, restore it
      for (const selectedRecord of selectedRecords) {
        const record = selectedRecord.record; // Get the actual record data from the DeletedRecord object
        
        // Special handling based on record type
        
        // If it's an offer, check and restore the customer first if needed
        if (isActiveTab(activeTab, 'offers') && record.customer_id) {
          // Check if the customer exists and is deleted
          const { data: customerData } = await supabase
            .from('customers')
            .select('id, deleted_at')
            .eq('id', record.customer_id)
            .single();
            
          if (customerData && customerData.deleted_at !== null) {
            // Customer exists but is deleted, restore it
            const { error: customerRestoreError } = await supabase
              .from('customers')
              .update({ deleted_at: null })
              .eq('id', record.customer_id);
              
            if (customerRestoreError) {
              console.error('Could not restore associated customer:', customerRestoreError);
              toast({
                title: "Προειδοποίηση",
                description: "Δεν ήταν δυνατή η ανάκτηση του συσχετισμένου πελάτη",
                variant: "destructive",
              });
            } else {
              console.log(`Successfully restored associated customer: ${record.customer_id}`);
            }
          }
        }
        
        // If it's offer_details, check and restore the offer and customer first if needed
        if (isActiveTab(activeTab, 'offer_details') && record.offer_id) {
          // Check if the offer exists and is deleted
          const { data: offerData } = await supabase
            .from('offers')
            .select('id, deleted_at, customer_id')
            .eq('id', record.offer_id)
            .single();
          
          if (offerData && offerData.deleted_at !== null) {
            // Check if the customer of this offer is deleted
            if (offerData.customer_id) {
              const { data: customerData } = await supabase
                .from('customers')
                .select('id, deleted_at')
                .eq('id', offerData.customer_id)
                .single();
              
              if (customerData && customerData.deleted_at !== null) {
                // Restore the customer first
                const { error: customerRestoreError } = await supabase
                  .from('customers')
                  .update({ deleted_at: null })
                  .eq('id', offerData.customer_id);
                  
                if (customerRestoreError) {
                  console.error('Could not restore associated customer:', customerRestoreError);
                  toast({
                    title: "Προειδοποίηση",
                    description: "Δεν ήταν δυνατή η ανάκτηση του συσχετισμένου πελάτη",
                    variant: "destructive",
                  });
                } else {
                  console.log(`Successfully restored associated customer: ${offerData.customer_id}`);
                }
              }
            }
            
            // Offer exists but is deleted, restore it
            const { error: offerRestoreError } = await supabase
              .from('offers')
              .update({ deleted_at: null })
              .eq('id', record.offer_id);
              
            if (offerRestoreError) {
              console.error('Could not restore associated offer:', offerRestoreError);
              toast({
                title: "Προειδοποίηση",
                description: "Δεν ήταν δυνατή η ανάκτηση της συσχετισμένης προσφοράς",
                variant: "destructive",
              });
            } else {
              console.log(`Successfully restored associated offer: ${record.offer_id}`);
            }
          }
        }
        
        // Restore the main record
        const { error: restoreError } = await supabase
          .from(activeTab)
          .update({ deleted_at: null })
          .eq('id', selectedRecord.id); // Use the ID from the DeletedRecord object
          
        if (restoreError) {
          console.error('Could not restore record:', restoreError);
          throw restoreError;
        }
        
        // If this is an offer, also restore any associated offer_details
        if (isActiveTab(activeTab, 'offers')) {
          // Restore any offer_details related to this offer
          const { error: detailsError } = await supabase
            .from('offer_details')
            .update({ deleted_at: null })
            .eq('offer_id', selectedRecord.id); // Use the ID from the DeletedRecord object
          
          if (detailsError) {
            console.warn('Could not restore related offer details:', detailsError);
            // Don't throw here since this is not critical
          }
        }
      }
      
      // All operations completed successfully
      setIsRestoringSuccessful(true);
      setIsRestoring(false);
      
      // Refresh the data to show the changes
      refreshDeletedRecords();
    } catch (error) {
      console.error('Error during batch restoration:', error);
      
      toast({
        title: "Σφάλμα",
        description: "Προέκυψε σφάλμα κατά τη μαζική ανάκτηση.",
        variant: "destructive",
      });
      
      // Reset dialog state
      setIsRestoring(false);
      setShowBatchRestoreDialog(false);
      setSelectedRecords([]);
    }
  };
  
  // Function to manually run the cleanup
  const handlePurgeOldRecords = async () => {
    try {
      const { error } = await supabase
        .rpc('cleanup_all_soft_deleted_records');
        
      if (error) throw error;
      
      // Refresh the current list
      const { data, error: fetchError } = await supabase
        .rpc('list_deleted_records', { table_name: activeTab });
        
      if (fetchError) throw fetchError;
      
      // Sort the records by deleted_at date, newest first
      const sortedData = data ? [...data].sort((a, b) => 
        new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      ) : [];
      
      setDeletedRecords(sortedData);
      toast({
        title: "Επιτυχής εκκαθάριση",
        description: "Οι παλιές εγγραφές εκκαθαρίστηκαν με επιτυχία.",
        variant: "default",
      });
    } catch (error) {
      console.error(`Error purging old records:`, error);
      toast({
        title: "Σφάλμα",
        description: "Υπήρξε πρόβλημα κατά την εκκαθάριση των παλιών εγγραφών.",
        variant: "destructive",
      });
    } finally {
      setShowPurgeDialog(false);
    }
  };

  // Handle selecting/deselecting a record for batch restore
  const toggleRecordSelection = (record: DeletedRecord) => {
    if (selectedRecords.some(selected => selected.id === record.id)) {
      // If already selected, remove it
      setSelectedRecords(prev => prev.filter(selected => selected.id !== record.id));
    } else {
      // If not selected, add it (store the FULL record)
      setSelectedRecords(prev => [...prev, record]);
    }
  };

  // Toggle selection of all records
  const toggleSelectAll = () => {
    if (selectedRecords.length === deletedRecords.length) {
      // Clear all selections
      setSelectedRecords([]);
    } else {
      // Select all records (using the records property from each deleted record)
      setSelectedRecords(deletedRecords);
    }
  };
  
  // Render the restore confirmation dialog
  const renderRestoreDialog = () => {
    if (!recordToRestore) return null;
    
    const recordName = getRecordTitle(recordToRestore.record, activeTab);
    
    return (
      <AlertDialog open={showRestoreDialog} onOpenChange={(open) => {
        // Don't close the dialog if restoration is in progress
        if (!isRestoring && !open) {
          setShowRestoreDialog(false);
          setRecordToRestore(null);
          setIsRestoringSuccessful(false);
        }
      }}>
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">
              {isRestoring 
                ? "Ανάκτηση σε Εξέλιξη"
                : isRestoringSuccessful 
                  ? "Επιτυχής Ανάκτηση" 
                  : "Επιβεβαίωση Ανάκτησης"}
            </AlertDialogTitle>
            <div className="text-[#84a98c] text-sm">
              {isRestoring ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#52796f] border-t-transparent"></div>
                  <div className="text-[#cad2c5]">Η ανάκτηση βρίσκεται σε εξέλιξη. Παρακαλώ περιμένετε...</div>
                  <div className="text-sm text-[#84a98c]">Αυτή η διαδικασία μπορεί να διαρκέσει μερικά δευτερόλεπτα.</div>
                </div>
              ) : isRestoringSuccessful ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-center text-green-500 font-medium">
                    {isActiveTab(activeTab, 'customers') && `Ο πελάτης ${recordName} ανακτήθηκε με επιτυχία!`}
                    {isActiveTab(activeTab, 'offers') && `Η προσφορά ανακτήθηκε με επιτυχία!`}
                    {isActiveTab(activeTab, 'contacts') && `Η επαφή ανακτήθηκε με επιτυχία!`}
                    {isActiveTab(activeTab, 'offer_details') && `Η λεπτομέρεια προσφοράς ανακτήθηκε με επιτυχία!`}
                    {isActiveTab(activeTab, 'tasks') && `Η εργασία ανακτήθηκε με επιτυχία!`}
                    {isActiveTab(activeTab, 'users') && `Ο χρήστης ανακτήθηκε με επιτυχία!`}
                  </div>
                  {isActiveTab(activeTab, 'offers') && recordToRestore?.record?.customer_id && (
                    <div className="text-sm text-[#84a98c]">
                      Ο σχετικός πελάτης έχει επίσης ανακτηθεί εάν ήταν διαγραμμένος.
                    </div>
                  )}
                  {isActiveTab(activeTab, 'offer_details') && recordToRestore?.record?.offer_id && (
                    <div className="text-sm text-[#84a98c]">
                      Η σχετική προσφορά και ο πελάτης έχουν επίσης ανακτηθεί εάν ήταν διαγραμμένοι.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-3">Είστε σίγουροι ότι θέλετε να ανακτήσετε αυτή την εγγραφή;</div>
                  <div>
                    <div className="mt-3 p-3 bg-[#354f52] rounded-lg">
                      <div className="font-medium text-sm text-[#cad2c5]">{getRecordTitle(recordToRestore.record, activeTab)}</div>
                      {getRecordDetails(recordToRestore.record, activeTab)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            {isRestoringSuccessful && !isRestoring ? (
              <Button 
                onClick={() => {
                  setShowRestoreDialog(false);
                  setRecordToRestore(null);
                  setIsRestoringSuccessful(false);
                  refreshDeletedRecords();
                }}
                className="bg-[#52796f] hover:bg-[#52796f]/90 text-white"
              >
                OK
              </Button>
            ) : (
              <>
                <AlertDialogCancel className="bg-transparent border border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white" disabled={isRestoring}>
                  Άκυρο
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default to handle manually
                    handleRestoreWithUI();
                  }}
                  className="bg-[#52796f] hover:bg-[#3a5a44] text-white"
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Ανάκτηση...
                    </>
                  ) : "Ανάκτηση"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Render the batch restore dialog
  const renderBatchRestoreDialog = () => {
    if (selectedRecords.length === 0) return null;
    
    return (
      <AlertDialog 
        open={showBatchRestoreDialog} 
        onOpenChange={(open) => {
          // Don't close the dialog if restoration is in progress
          if (!isRestoring && !open) {
            setShowBatchRestoreDialog(false);
            setSelectedRecords([]);
            setIsRestoringSuccessful(false);
          }
        }}
      >
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">
              {isRestoring 
                ? "Ανάκτηση σε Εξέλιξη"
                : isRestoringSuccessful 
                  ? "Επιτυχής Ανάκτηση" 
                  : "Επιβεβαίωση Μαζικής Ανάκτησης"}
            </AlertDialogTitle>
            <div className="text-[#84a98c] text-sm">
              {isRestoring ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#52796f] border-t-transparent"></div>
                  <div className="text-[#cad2c5]">Η ανάκτηση βρίσκεται σε εξέλιξη. Παρακαλώ περιμένετε...</div>
                  <div className="text-sm text-[#84a98c]">Αυτή η διαδικασία μπορεί να διαρκέσει μερικά δευτερόλεπτα.</div>
                </div>
              ) : isRestoringSuccessful ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-3">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-center text-green-500 font-medium">
                    {selectedRecords.length} εγγραφές ανακτήθηκαν με επιτυχία!
                  </div>
                  {isActiveTab(activeTab, 'offers') && (
                    <div className="text-sm text-[#84a98c]">
                      Οι σχετικοί πελάτες των προσφορών έχουν επίσης ανακτηθεί εάν ήταν διαγραμμένοι.
                    </div>
                  )}
                  {isActiveTab(activeTab, 'offer_details') && (
                    <div className="text-sm text-[#84a98c]">
                      Οι σχετικές προσφορές και οι πελάτες έχουν επίσης ανακτηθεί εάν ήταν διαγραμμένοι.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  Είστε σίγουροι ότι θέλετε να ανακτήσετε όλες τις επιλεγμένες εγγραφές ({selectedRecords.length});
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            {isRestoringSuccessful && !isRestoring ? (
              <Button 
                onClick={() => {
                  setShowBatchRestoreDialog(false);
                  setSelectedRecords([]);
                  setIsRestoringSuccessful(false);
                  refreshDeletedRecords();
                }}
                className="bg-[#52796f] hover:bg-[#52796f]/90 text-white"
              >
                OK
              </Button>
            ) : (
              <>
                <AlertDialogCancel className="bg-transparent border border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white" disabled={isRestoring}>
                  Άκυρο
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default to handle manually
                    handleBatchRestoreWithUI();
                  }}
                  className="bg-[#52796f] hover:bg-[#3a5a44] text-white"
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Ανάκτηση...
                    </>
                  ) : "Ανάκτηση"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Render the component
  
  // If user is not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-[#cad2c5]">Πρόσβαση Απορρίφθηκε</h1>
        <p className="text-[#84a98c]">
          Δεν έχετε δικαιώματα για να δείτε αυτή τη σελίδα.
        </p>
      </div>
    );
  }

  // Find the current table info
  const currentTable = TABLES_WITH_SOFT_DELETE.find(t => t.id === activeTab) || TABLES_WITH_SOFT_DELETE[0];
  const TableIcon = currentTable.icon;

  // Add the styles to the document
  useEffect(() => {
    // Add the custom styles to the document head
    const styleElement = document.createElement('style');
    styleElement.textContent = customStyles;
    document.head.appendChild(styleElement);

    // Clean up on component unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Render the actual component (only for admin users)
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#cad2c5]">Ανάκτηση Διαγραμμένων Εγγραφών</h1>
        <Button 
          variant="destructive" 
          onClick={() => setShowPurgeDialog(true)}
          className="flex items-center"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Εκκαθάριση Παλαιών Εγγραφών
        </Button>
      </div>
      
      <Card className="mb-4 bg-[#354f52] border-[#52796f]">
        <CardContent className="p-3">
          <div className="text-sm text-[#cad2c5]">
            Εδώ μπορείτε να δείτε και να ανακτήσετε εγγραφές που έχουν διαγραφεί τις τελευταίες 30 ημέρες.
            Μετά από 30 ημέρες, οι διαγραμμένες εγγραφές διαγράφονται οριστικά από το σύστημα.
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value as TableType)} className="text-[#cad2c5]">
        <TabsList className="mb-6 bg-[#2f3e46] border border-[#52796f]">
          {TABLES_WITH_SOFT_DELETE.map(table => (
            <TabsTrigger 
              key={table.id} 
              value={table.id}
              className="data-[state=active]:bg-[#52796f] data-[state=active]:text-[#cad2c5]"
            >
              <table.icon className="h-4 w-4 mr-2" />
              {table.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {TABLES_WITH_SOFT_DELETE.map(table => (
          <TabsContent key={table.id} value={table.id}>
            <Card className="bg-[#354f52] border-[#52796f]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <TableIcon className="h-5 w-5 mr-2 text-[#84a98c]" />
                    <h2 className="text-lg font-semibold text-[#cad2c5]">Διαγραμμένα → {table.name}</h2>
                  </div>
                  
                  {selectedRecords.length > 0 && (
                    <Button
                      variant="outline"
                      className="flex items-center bg-[#52796f] hover:bg-[#52796f]/80 text-[#cad2c5] border-[#52796f]"
                      onClick={() => setShowBatchRestoreDialog(true)}
                      disabled={isRestoring}
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Ανάκτηση Επιλεγμένων ({selectedRecords.length})
                    </Button>
                  )}
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#52796f] border-t-transparent" />
                      <div className="mt-4 text-[#cad2c5]">Φόρτωση διαγραμμένων εγγραφών...</div>
                    </div>
                  </div>
                ) : deletedRecords.length === 0 ? (
                  <div className="text-center py-12 text-[#84a98c]">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 text-[#52796f] opacity-50" />
                    <span>Δεν υπάρχουν διαγραμμένες εγγραφές για {table.name}.</span>
                  </div>
                ) : (
                  <div className="scrollable-table-container">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-[#cad2c5]">
                            <Checkbox
                              checked={selectedRecords.length === deletedRecords.length}
                              onCheckedChange={toggleSelectAll}
                              className="border-[#52796f]"
                            />
                          </TableHead>
                          <TableHead className="text-[#cad2c5]">Εγγραφή</TableHead>
                          <TableHead className="text-[#cad2c5]">Διαγράφηκε</TableHead>
                          <TableHead className="text-right text-[#cad2c5]">Ενέργειες</TableHead>
                        </TableRow>
                      </TableHeader>
                      
                      <TableBody className="divide-y divide-[#52796f]">
                        {deletedRecords.map(record => (
                          <TableRow 
                            key={record.id}
                            className="bg-[#354f52] hover:bg-[#2f3e46]"
                          >
                            <TableCell>
                              <Checkbox 
                                checked={selectedRecords.some(selected => selected.id === record.id)} 
                                onCheckedChange={() => toggleRecordSelection(record)}
                                className="border-[#52796f]"
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-[#cad2c5] flex items-center">
                                  {getRecordTitle(record.record, table.id)}
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="text-[#84a98c] p-0 h-auto text-xs hover:text-[#cad2c5] ml-2"
                                    onClick={() => handleViewDetails(record)}
                                  >
                                    Προβολή λεπτομερειών
                                  </Button>
                                </div>
                                <div className="text-xs text-[#84a98c] mt-1">
                                  {table.id === 'contacts' && record.record.customer_id && (
                                    <div className="flex items-center">
                                      <span className="text-[#84a98c] text-xs mr-1">Πελάτης:</span>
                                      <CustomerName customerId={record.record.customer_id} />
                                    </div>
                                  )}
                                  {table.id === 'offers' && record.record.customer_id && (
                                    <div className="flex items-center">
                                      <span className="text-[#84a98c] text-xs mr-1">Πελάτης:</span>
                                      <CustomerName customerId={record.record.customer_id} />
                                    </div>
                                  )}
                                  {table.id === 'offer_details' && record.record.offer_id && (
                                    <div className="flex items-center">
                                      <span className="text-[#84a98c] text-xs mr-1">Προσφορά:</span>
                                      <OfferName offerId={record.record.offer_id} />
                                    </div>
                                  )}
                                  {table.id === 'customers' && record.record.afm && (
                                    <div className="flex items-center">
                                      <span className="text-[#84a98c] text-xs mr-1">ΑΦΜ:</span>
                                      <span>{record.record.afm}</span>
                                    </div>
                                  )}
                                  {table.id === 'tasks' && record.record.status && (
                                    <div className="flex items-center">
                                      <span className="text-[#84a98c] text-xs mr-1">Κατάσταση:</span>
                                      <Badge variant="outline" className="text-xs">
                                        {record.record.status}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-[#84a98c] text-sm">
                              {formatDateTime(record.deleted_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="outline"
                                size="sm"
                                className="flex items-center bg-[#52796f] hover:bg-[#52796f]/80 text-[#cad2c5] border-[#52796f]"
                                onClick={() => {
                                  setRecordToRestore(record);
                                  setShowRestoreDialog(true);
                                }}
                              >
                                <Undo2 className="h-3 w-3 mr-1" />
                                Ανάκτηση
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      {renderRestoreDialog()}
      {renderBatchRestoreDialog()}
      
      {/* Purge Confirmation Dialog */}
      <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <AlertDialogContent className="bg-[#354f52] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Επιβεβαίωση Εκκαθάρισης</AlertDialogTitle>
            <div className="text-[#84a98c] text-sm">
              Αυτή η ενέργεια θα διαγράψει οριστικά όλες τις εγγραφές που έχουν διαγραφεί πριν από 30 ημέρες.
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Θέλετε να συνεχίσετε;
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2f3e46] text-[#cad2c5] hover:bg-[#2f3e46]/80 border-[#52796f]">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePurgeOldRecords}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Εκκαθάριση
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Record Details Dialog */}
      <AlertDialog open={showRecordDetailsDialog} onOpenChange={setShowRecordDetailsDialog}>
        <AlertDialogContent className="bg-[#354f52] border-[#52796f] text-[#cad2c5] max-w-2xl max-h-[80vh] overflow-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5] flex items-center justify-between">
              <span>Λεπτομέρειες Διαγραμμένης Εγγραφής</span>
              <Badge className="bg-[#52796f] text-[#cad2c5]">
                {activeTab === 'customers' ? 'Πελάτης' : 
                 activeTab === 'contacts' ? 'Επαφή' : 
                 activeTab === 'offers' ? 'Προσφορά' :
                 activeTab === 'offer_details' ? 'Λεπτομέρεια Προσφοράς' :
                 activeTab === 'tasks' ? 'Εργασία' : 'Χρήστης'}
              </Badge>
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          {recordDetails && (
            <div className="py-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Display warnings about missing parent records */}
                {isCheckingRelations ? (
                  <span className="bg-[#2f3e46] rounded p-3 text-center block">
                    <span className="flex items-center justify-center space-x-2">
                      <span>Έλεγχος σχετικών εγγραφών...</span>
                      <span className="h-2 w-2 bg-[#84a98c] rounded-full animate-bounce"></span>
                      <span className="h-2 w-2 bg-[#84a98c] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="h-2 w-2 bg-[#84a98c] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                  </span>
                ) : (
                  <div className="space-y-3">
                    {isActiveTab(activeTab, 'offers') && recordDetails.record.customer_id && relatedRecordsExist.customer === false && (
                      <div className="bg-amber-900/30 border border-amber-500/50 rounded p-3">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                          <span className="text-amber-200">
                            Προειδοποίηση: Ο πελάτης αυτής της προσφοράς δεν υπάρχει ή είναι διαγραμμένος.
                            Μπορεί να χρειαστεί να ανακτήσετε πρώτα τον πελάτη.
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {isActiveTab(activeTab, 'contacts') && recordDetails.record.customer_id && relatedRecordsExist.customer === false && (
                      <div className="bg-amber-900/30 border border-amber-500/50 rounded p-3">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                          <span className="text-amber-200">
                            Προειδοποίηση: Ο πελάτης αυτής της επαφής δεν υπάρχει ή είναι διαγραμμένος.
                            Μπορεί να χρειαστεί να ανακτήσετε πρώτα τον πελάτη.
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {isActiveTab(activeTab, 'offer_details') && recordDetails.record.offer_id && relatedRecordsExist.offer === false && (
                      <div className="bg-amber-900/30 border border-amber-500/50 rounded p-3">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                          <span className="text-amber-200">
                            Προειδοποίηση: Η προσφορά αυτής της λεπτομέρειας δεν υπάρχει ή είναι διαγραμμένη.
                            Πρέπει να ανακτήσετε πρώτα την προσφορά.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="bg-[#2f3e46] rounded-md p-4 border border-[#52796f]">
                  <h3 className="text-lg font-medium text-[#cad2c5] mb-3">
                    {getRecordTitle(recordDetails.record, activeTab)}
                  </h3>
                  
                  <div className="text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(recordDetails.record).map(([key, value]) => {
                        // Skip internal fields or null values
                        if (key === 'id' || key === 'deleted_at' || value === null || value === '') return null;
                        
                        // For foreign keys, show linked entity names when possible
                        if (key === 'customer_id' && typeof value === 'string') {
                          return (
                            <div key={key} className="flex flex-col">
                              <span className="text-[#84a98c] text-xs">Πελάτης:</span>
                              <div className="mt-1">
                                <CustomerName customerId={value as string} />
                              </div>
                            </div>
                          );
                        }
                        
                        if (key === 'offer_id' && typeof value === 'string') {
                          return (
                            <div key={key} className="flex flex-col">
                              <span className="text-[#84a98c] text-xs">Προσφορά:</span>
                              <div className="mt-1">
                                <OfferName offerId={value as string} />
                              </div>
                            </div>
                          );
                        }
                        
                        if (key === 'user_id' && typeof value === 'string') {
                          return (
                            <div key={key} className="flex flex-col">
                              <span className="text-[#84a98c] text-xs">Χρήστης:</span>
                              <div className="mt-1">
                                <UserName userId={value as string} />
                              </div>
                            </div>
                          );
                        }
                        
                        // Format dates
                        if ((key.includes('date') || key.includes('at')) && typeof value === 'string') {
                          return (
                            <div key={key} className="flex flex-col">
                              <span className="text-[#84a98c] text-xs">{key}:</span>
                              <span className="mt-1">{formatDateTime(value as string)}</span>
                            </div>
                          );
                        }
                        
                        // Handle complex objects (like arrays or nested objects)
                        if (typeof value === 'object') {
                          return (
                            <div key={key} className="flex flex-col col-span-2">
                              <span className="text-[#84a98c] text-xs">{key}:</span>
                              <pre className="mt-1 text-xs bg-[#2f3e46] p-2 rounded overflow-auto max-h-40 border border-[#52796f] text-[#cad2c5]">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={key} className="flex flex-col">
                            <span className="text-[#84a98c] text-xs">{key}:</span>
                            <span className="mt-1">{value as string}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-[#84a98c]">
                  <div>Διαγράφηκε: {formatDateTime(recordDetails.deleted_at)}</div>
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2f3e46] text-[#cad2c5] hover:bg-[#2f3e46]/80 border-[#52796f]">
              Κλείσιμο
            </AlertDialogCancel>
            <Button
              variant="default"
              className="bg-[#52796f] hover:bg-[#52796f]/80 text-[#cad2c5]"
              onClick={() => {
                setRecordToRestore(recordDetails);
                setShowRecordDetailsDialog(false);
                setShowRestoreDialog(true);
              }}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Ανάκτηση
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 