import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Undo2,
  Trash2,
  AlertCircle,
  Users,
  Building,
  FileText,
  CheckSquare,
  Phone,
  Check,
  TableIcon
} from "lucide-react";
import { formatDateTime } from "@/utils/formatUtils";
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
import { createPrefixedLogger } from "@/utils/loggingUtils";
// Add AppTabs import
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";
import { Loader } from "@/components/ui/Loader";

// Create a logger for this component
const logger = createPrefixedLogger('RecoveryPage');

// Define the tables that have soft delete enabled
const TABLES_WITH_SOFT_DELETE = [
  { id: 'customers' as TableType, name: 'Πελάτες', icon: Building },
  { id: 'contacts' as TableType, name: 'Επαφές', icon: Users },
  { id: 'offers' as TableType, name: 'Προσφορές', icon: FileText },
  { id: 'offer_details' as TableType, name: 'Λεπτομέρειες Προσφορών', icon: FileText },
  { id: 'tasks' as TableType, name: 'Εργασίες', icon: CheckSquare },
  { id: 'users' as TableType, name: 'Χρήστες', icon: Users }
];

// Type for deleted records
type DeletedRecord = {
  id: string;
  deleted_at: string;
  record?: any;
  [key: string]: any;
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
          // Safety check if data might be a SelectQueryError
          const safeData = data as any;
          const offerTitle = safeData.title || `Προσφορά: ${safeData.amount || ''}`;
          setOfferName(offerTitle);
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
      if (isActiveTab(activeTab, 'offers') && record.record?.customer_id) {
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
      
      if (isActiveTab(activeTab, 'contacts') && record.record?.customer_id) {
        // Check if customer exists
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', record.record.customer_id)
          .is('deleted_at', null)
          .single();
        
        relations.customer = !!customerData;
      }
      
      if (isActiveTab(activeTab, 'offer_details') && record.record?.offer_id) {
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
      if (isActiveTab(activeTab, 'offers') && record.record?.customer_id) {
        relations.customer = false;
      } else if (isActiveTab(activeTab, 'contacts') && record.record?.customer_id) {
        relations.customer = false;
      } else if (isActiveTab(activeTab, 'offer_details') && record.record?.offer_id) {
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
      
      logger.info(`Starting restoration of ${activeTab} record:`, recordToRestore.record.id);
      
      // Special handling for offers to check if associated customer exists
      if (isActiveTab(activeTab, 'offers') && recordToRestore.record.customer_id) {
        logger.debug(`Checking associated customer: ${recordToRestore.record.customer_id}`);
        
        // Check if the customer exists (deleted or not)
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id, deleted_at')
          .eq('id', recordToRestore.record.customer_id)
          .single();
        
        logger.debug('Customer check result:', existingCustomer);
          
        // If customer exists but is deleted, restore it first
        if (existingCustomer && existingCustomer.deleted_at !== null) {
          logger.info(`Restoring associated customer: ${existingCustomer.id}`);
          
          const { error: customerRestoreError } = await supabase
            .from('customers')
            .update({ deleted_at: null })
            .eq('id', recordToRestore.record.customer_id);
            
          if (customerRestoreError) {
            logger.error('Error restoring associated customer:', customerRestoreError);
            toast({
              title: "Σφάλμα",
              description: "Προέκυψε σφάλμα κατά την ανάκτηση του συσχετισμένου πελάτη",
              variant: "destructive",
            });
          } else {
            logger.info(`Successfully restored associated customer: ${existingCustomer.id}`);
            toast({
              title: "Επιτυχία",
              description: "Ο συσχετισμένος πελάτης ανακτήθηκε επιτυχώς",
              variant: "default",
            });
          }
        }
      }
      
      // If offer_details, check if offer needs restoration
      if (isActiveTab(activeTab, 'offer_details') && recordToRestore.record.offer_id) {
        logger.debug(`Checking associated offer: ${recordToRestore.record.offer_id}`);
        
        // Check if the offer exists but is deleted
        const { data: existingOffer } = await supabase
          .from('offers')
          .select('id, deleted_at, customer_id')
          .eq('id', recordToRestore.record.offer_id)
          .single();
        
        logger.debug('Offer check result:', existingOffer);
          
        // If offer exists but is deleted, restore it too
        if (existingOffer && existingOffer.deleted_at !== null) {
          // First check if the customer associated with this offer is deleted
          if (existingOffer.customer_id) {
            logger.debug(`Checking customer of offer: ${existingOffer.customer_id}`);
            
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id, deleted_at')
              .eq('id', existingOffer.customer_id)
              .single();
            
            logger.debug('Customer of offer check result:', existingCustomer);
              
            // If customer exists but is deleted, restore it first
            if (existingCustomer && existingCustomer.deleted_at !== null) {
              logger.info(`Restoring customer of offer: ${existingCustomer.id}`);
              
              const { error: customerRestoreError } = await supabase
                .from('customers')
                .update({ deleted_at: null })
                .eq('id', existingOffer.customer_id);
                
              if (customerRestoreError) {
                logger.error('Error restoring associated customer:', customerRestoreError);
                toast({
                  title: "Σφάλμα",
                  description: "Προέκυψε σφάλμα κατά την ανάκτηση του συσχετισμένου πελάτη",
                  variant: "destructive",
                });
              } else {
                logger.info(`Successfully restored associated customer: ${existingCustomer.id}`);
                toast({
                  title: "Επιτυχία",
                  description: "Ο συσχετισμένος πελάτης ανακτήθηκε επιτυχώς",
                  variant: "default",
                });
              }
            }
          }

          // Now restore the offer
          logger.info(`Restoring associated offer: ${existingOffer.id}`);
          
          const { error: offerRestoreError } = await supabase
            .from('offers')
            .update({ deleted_at: null })
            .eq('id', recordToRestore.record.offer_id);
            
          if (offerRestoreError) {
            logger.error('Error restoring associated offer:', offerRestoreError);
            toast({
              title: "Σφάλμα",
              description: "Προέκυψε σφάλμα κατά την ανάκτηση της συσχετισμένης προσφοράς",
              variant: "destructive",
            });
          } else {
            logger.info(`Successfully restored associated offer: ${existingOffer.id}`);
            toast({
              title: "Επιτυχία",
              description: "Η συσχετισμένη προσφορά ανακτήθηκε επιτυχώς",
              variant: "default",
            });
          }
        }
      }
      
      // Restore the main record
      logger.info(`Restoring main ${activeTab} record: ${recordToRestore.record.id}`);
      
      const { error: restoreError } = await supabase
        .from(activeTab)
        .update({ deleted_at: null })
        .eq('id', recordToRestore.record.id);
        
      if (restoreError) {
        logger.error('Error restoring main record:', restoreError);
        toast({
          title: "Σφάλμα",
          description: "Προέκυψε σφάλμα κατά την ανάκτηση της εγγραφής",
          variant: "destructive",
        });
      } else {
        logger.info('Restoration complete');
        
        // Refresh data
        refreshDeletedRecords();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        variant: "destructive",
        title: "Σφάλμα κατά την ανάκτηση της εγγραφής",
        description: errorMessage,
      });
      logger.error('Error during restoration', error);
      
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
              logger.error('Could not restore associated customer:', customerRestoreError);
              toast({
                title: "Προειδοποίηση",
                description: "Δεν ήταν δυνατή η ανάκτηση του συσχετισμένου πελάτη",
                variant: "destructive",
              });
            } else {
              logger.info(`Successfully restored associated customer: ${record.customer_id}`);
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
                  logger.error('Could not restore associated customer:', customerRestoreError);
                  toast({
                    title: "Προειδοποίηση",
                    description: "Δεν ήταν δυνατή η ανάκτηση του συσχετισμένου πελάτη",
                    variant: "destructive",
                  });
                } else {
                  logger.info(`Successfully restored associated customer: ${offerData.customer_id}`);
                }
              }
            }
            
            // Offer exists but is deleted, restore it
            const { error: offerRestoreError } = await supabase
              .from('offers')
              .update({ deleted_at: null })
              .eq('id', record.offer_id);
              
            if (offerRestoreError) {
              logger.error('Could not restore associated offer:', offerRestoreError);
              toast({
                title: "Προειδοποίηση",
                description: "Δεν ήταν δυνατή η ανάκτηση της συσχετισμένης προσφοράς",
                variant: "destructive",
              });
            } else {
              logger.info(`Successfully restored associated offer: ${record.offer_id}`);
            }
          }
        }
        
        // Restore the main record
        const { error: restoreError } = await supabase
          .from(activeTab)
          .update({ deleted_at: null })
          .eq('id', selectedRecord.id); // Use the ID from the DeletedRecord object
          
        if (restoreError) {
          logger.error('Could not restore record:', restoreError);
          throw restoreError;
        }
        
        // If this is an offer, also restore any associated offer_details
        if (isActiveTab(activeTab, 'offers')) {
          // Restore any offer_details related to this offer
          const { error: detailsError } = await supabase
            .from('offer_details')
            .update({ deleted_at: null } as any)
            .eq('offer_id', selectedRecord.id); // Use the ID from the DeletedRecord object
          
          if (detailsError) {
            logger.warn('Could not restore related offer details:', detailsError);
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
      logger.error('Error during batch restoration:', error);
      
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
                  <Loader size={40} />
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
                      <Loader size={16} className="mr-2" />
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
                  <Loader size={40} />
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
                      <Loader size={16} className="mr-2" />
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
      
      <div className="flex flex-col gap-4">
        {/* Tabs for different entity types */}
        <AppTabs value={activeTab} onValueChange={(value) => setActiveTab(value as TableType)}>
          <AppTabsList>
            {TABLES_WITH_SOFT_DELETE.map((table) => {
              const Icon = table.icon;
              return (
                <AppTabsTrigger 
                  key={table.id} 
                  value={table.id}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {table.name}
                </AppTabsTrigger>
              );
            })}
          </AppTabsList>
          
          {/* Batch actions */}
          {selectedRecords.length > 0 && (
            <div className="bg-[#354f52] p-3 m-4 rounded-md flex items-center justify-between">
              <div className="text-sm text-[#cad2c5]">
                <span className="font-medium">{selectedRecords.length}</span> εγγραφές επιλεγμένες
              </div>
              <Button
                onClick={() => setShowBatchRestoreDialog(true)}
                className="bg-[#52796f] hover:bg-[#3a5a44] text-white flex items-center"
                size="sm"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Μαζική Ανάκτηση
              </Button>
            </div>
          )}
          
          {/* Content for each tab */}
          {TABLES_WITH_SOFT_DELETE.map((table) => (
            <AppTabsContent key={table.id} value={table.id}>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-xl font-semibold text-[#cad2c5] flex items-center">
                  <table.icon className="h-5 w-5 mr-2" />
                  Διαγραμμένες εγγραφές - {table.name}
                </div>
                
                {deletedRecords.length > 0 && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={toggleSelectAll}
                      variant="outline"
                      size="sm"
                      className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white"
                    >
                      {selectedRecords.length === deletedRecords.length ? "Αποεπιλογή Όλων" : "Επιλογή Όλων"}
                    </Button>
                    <Button
                      onClick={() => refreshDeletedRecords()}
                      variant="outline"
                      size="sm"
                      className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white"
                    >
                      Ανανέωση
                    </Button>
                  </div>
                )}
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader size={48} />
                </div>
              ) : deletedRecords.length > 0 ? (
                <div className="scrollable-table-container">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox 
                            checked={selectedRecords.length === deletedRecords.length && deletedRecords.length > 0}
                            onCheckedChange={() => toggleSelectAll()}
                            aria-label="Επιλογή όλων"
                          />
                        </TableHead>
                        <TableHead>Εγγραφή</TableHead>
                        <TableHead>Λεπτομέρειες</TableHead>
                        <TableHead className="w-[180px]">Ημ/νία Διαγραφής</TableHead>
                        <TableHead className="w-[120px] text-right">Ενέργειες</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedRecords.some(selected => selected.id === record.id)}
                              onCheckedChange={() => toggleRecordSelection(record)}
                              aria-label="Επιλογή εγγραφής"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{getRecordTitle(record.record, activeTab)}</TableCell>
                          <TableCell>
                            {getRecordDetails(record.record, activeTab)}
                          </TableCell>
                          <TableCell>{formatDateTime(record.deleted_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                onClick={() => {
                                  setRecordToRestore(record);
                                  setShowRestoreDialog(true);
                                }}
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed border-[#52796f] rounded-lg bg-[#354f52]">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#2f3e46] flex items-center justify-center mb-4">
                    <Check className="h-6 w-6 text-[#84a98c]" />
                  </div>
                  <h3 className="text-xl font-medium text-[#cad2c5] mb-1">Δεν υπάρχουν διαγραμμένες εγγραφές</h3>
                  <p className="text-[#84a98c]">Δεν βρέθηκαν διαγραμμένες εγγραφές για {table.name.toLowerCase()}</p>
                </div>
              )}
            </AppTabsContent>
          ))}
        </AppTabs>
      </div>
      
      {/* Purge old records confirmation dialog */}
      <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Εκκαθάριση Παλαιών Εγγραφών</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Αυτή η ενέργεια θα διαγράψει μόνιμα τις εγγραφές που έχουν σημανθεί ως διαγραμμένες για περισσότερες από 30 ημέρες.
              <br /><br />
              Αυτή η ενέργεια είναι μη αναστρέψιμη και δεν μπορείτε να ανακτήσετε αυτές τις εγγραφές στο μέλλον.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePurgeOldRecords}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Εκκαθάριση
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Record details dialog */}
      <AlertDialog 
        open={showRecordDetailsDialog} 
        onOpenChange={setShowRecordDetailsDialog}
      >
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5] flex items-center">
              <TableIcon className="h-5 w-5 mr-2" />
              Λεπτομέρειες Διαγραμμένης Εγγραφής
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          {recordDetails && (
            <div className="my-4">
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-[#354f52] rounded-lg">
                  <h3 className="text-lg font-medium text-[#cad2c5] mb-2">
                    {getRecordTitle(recordDetails.record, activeTab)}
                  </h3>
                  
                  <div className="text-sm text-[#84a98c] mb-2 flex items-center">
                    <span className="mr-1">Διαγράφηκε στις:</span> 
                    {formatDateTime(recordDetails.deleted_at)}
                  </div>
                  
                  {/* Display warnings for related records */}
                  {isCheckingRelations ? (
                    <div className="flex items-center text-sm text-[#84a98c] my-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#84a98c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Έλεγχος συσχετισμένων εγγραφών...
                    </div>
                  ) : (
                    <>
                      {isActiveTab(activeTab, 'offers') && 
                        recordDetails.record.customer_id && 
                        relatedRecordsExist.hasOwnProperty('customer') && (
                        <div className={`flex items-center text-sm ${
                          relatedRecordsExist.customer ? 'text-green-500' : 'text-amber-500'
                        } my-2 p-2 rounded-md ${
                          relatedRecordsExist.customer ? 'bg-green-900/20' : 'bg-amber-900/20'
                        }`}>
                          {relatedRecordsExist.customer ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2" />
                          )}
                          {relatedRecordsExist.customer 
                            ? 'Ο πελάτης αυτής της προσφοράς υπάρχει.' 
                            : 'Ο πελάτης αυτής της προσφοράς έχει διαγραφεί και θα ανακτηθεί αυτόματα.'}
                        </div>
                      )}
                      
                      {isActiveTab(activeTab, 'contacts') && 
                        recordDetails.record.customer_id && 
                        relatedRecordsExist.hasOwnProperty('customer') && (
                        <div className={`flex items-center text-sm ${
                          relatedRecordsExist.customer ? 'text-green-500' : 'text-amber-500'
                        } my-2 p-2 rounded-md ${
                          relatedRecordsExist.customer ? 'bg-green-900/20' : 'bg-amber-900/20'
                        }`}>
                          {relatedRecordsExist.customer ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2" />
                          )}
                          {relatedRecordsExist.customer 
                            ? 'Ο πελάτης αυτής της επαφής υπάρχει.' 
                            : 'Ο πελάτης αυτής της επαφής έχει διαγραφεί και θα ανακτηθεί αυτόματα.'}
                        </div>
                      )}
                      
                      {isActiveTab(activeTab, 'offer_details') && 
                        recordDetails.record.offer_id && 
                        relatedRecordsExist.hasOwnProperty('offer') && (
                        <div className={`flex items-center text-sm ${
                          relatedRecordsExist.offer ? 'text-green-500' : 'text-amber-500'
                        } my-2 p-2 rounded-md ${
                          relatedRecordsExist.offer ? 'bg-green-900/20' : 'bg-amber-900/20'
                        }`}>
                          {relatedRecordsExist.offer ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2" />
                          )}
                          {relatedRecordsExist.offer 
                            ? 'Η προσφορά αυτής της λεπτομέρειας υπάρχει.' 
                            : 'Η προσφορά αυτής της λεπτομέρειας έχει διαγραφεί και θα ανακτηθεί αυτόματα.'}
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-[#cad2c5] mb-2">Λεπτομέρειες:</h4>
                    {getRecordDetails(recordDetails.record, activeTab)}
                  </div>
                </div>
                
                <div className="p-4 bg-[#354f52] rounded-lg">
                  <h4 className="text-sm font-medium text-[#cad2c5] mb-2">Δεδομένα JSON:</h4>
                  <pre className="text-xs bg-[#2f3e46] p-3 rounded-md overflow-auto max-h-60 border border-[#52796f] text-[#cad2c5]">
                    {JSON.stringify(recordDetails.record, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter className="border-t border-[#52796f] pt-4 mt-4">
            <AlertDialogCancel className="bg-transparent border border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-white">
              Κλείσιμο
            </AlertDialogCancel>
            {recordDetails && (
              <Button 
                onClick={() => {
                  setRecordToRestore(recordDetails);
                  setShowRecordDetailsDialog(false);
                  setShowRestoreDialog(true);
                }}
                className="bg-[#52796f] hover:bg-[#3a5a44] text-white flex items-center"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Ανάκτηση
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Batch restore dialog */}
      {renderBatchRestoreDialog()}
      
      {/* Restore confirmation dialog */}
      {renderRestoreDialog()}
    </div>
  );
} 
