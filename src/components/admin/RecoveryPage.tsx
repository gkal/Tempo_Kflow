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
  { id: 'customers', name: 'Πελάτες', icon: Building },
  { id: 'contacts', name: 'Επαφές', icon: User },
  { id: 'offers', name: 'Προσφορές', icon: FileText },
  { id: 'tasks', name: 'Εργασίες', icon: CheckSquare },
  { id: 'users', name: 'Χρήστες', icon: User }
];

// Type for deleted records
type DeletedRecord = {
  id: string;
  deleted_at: string;
  record: any;
};

// Helper function to get a readable title for a record
const getRecordTitle = (record: any, tableType: string): string => {
  switch (tableType) {
    case 'customers':
      return record.company_name || 'Άγνωστος Πελάτης';
    case 'contacts':
      return record.full_name || 'Άγνωστη Επαφή';
    case 'offers':
      return `Προσφορά: ${record.amount || 'Άγνωστο ποσό'}`;
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
        <div className="space-y-2">
          {record.afm && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">ΑΦΜ:</span>
              <span>{record.afm}</span>
            </div>
          )}
          {record.telephone && (
            <div className="flex items-center">
              <Phone className="h-3 w-3 mr-2 text-[#84a98c]" />
              <span>{record.telephone}</span>
            </div>
          )}
          {record.email && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Email:</span>
              <span>{record.email}</span>
            </div>
          )}
          {record.address && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Διεύθυνση:</span>
              <span>{record.address}</span>
            </div>
          )}
        </div>
      );
    case 'contacts':
      return (
        <div className="space-y-2">
          {record.position && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Θέση:</span>
              <span>{record.position}</span>
            </div>
          )}
          {record.phone && (
            <div className="flex items-center">
              <Phone className="h-3 w-3 mr-2 text-[#84a98c]" />
              <span>{record.phone}</span>
            </div>
          )}
          {record.email && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Email:</span>
              <span>{record.email}</span>
            </div>
          )}
          {record.customer_id && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Πελάτης:</span>
              <CustomerName customerId={record.customer_id} />
            </div>
          )}
        </div>
      );
    case 'offers':
      return (
        <div className="space-y-2">
          {record.requirements && (
            <div className="flex items-start">
              <span className="text-[#84a98c] text-xs mr-2">Απαιτήσεις:</span>
              <span className="text-sm">{record.requirements}</span>
            </div>
          )}
          {record.amount && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Ποσό:</span>
              <span>{record.amount}</span>
            </div>
          )}
          {record.offer_result && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Αποτέλεσμα:</span>
              <Badge variant="outline" className="text-xs">
                {record.offer_result}
              </Badge>
            </div>
          )}
          {record.customer_id && (
            <div className="flex items-center">
              <span className="text-[#84a98c] text-xs mr-2">Πελάτης:</span>
              <CustomerName customerId={record.customer_id} />
            </div>
          )}
        </div>
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
  
  useEffect(() => {
    const fetchCustomerName = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('company_name')
          .eq('id', customerId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setCustomerName(data.company_name);
        }
      } catch (error) {
        console.error('Error fetching customer name:', error);
        setCustomerName(`ID: ${customerId}`);
      }
    };
    
    fetchCustomerName();
  }, [customerId]);
  
  if (!customerName) {
    return (
      <div className="flex items-center">
        <svg className="animate-spin h-4 w-4 text-[#52796f] mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
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

export default function RecoveryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABLES_WITH_SOFT_DELETE[0].id);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [recordToRestore, setRecordToRestore] = useState<DeletedRecord | null>(null);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showBatchRestoreDialog, setShowBatchRestoreDialog] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

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
        
        setDeletedRecords(data || []);
      } catch (error) {
        console.error(`Error fetching deleted ${activeTab}:`, error);
        setDeletedRecords([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeletedRecords();
  }, [activeTab, isAdmin]);
  
  // Function to restore a single deleted record
  const handleRestore = async () => {
    if (!recordToRestore) return;
    
    try {
      const { data, error } = await supabase
        .rpc('restore_deleted_record', { 
          table_name: activeTab,
          record_id: recordToRestore.id
        });
        
      if (error) throw error;
      
      if (data) {
        // Remove the restored record from the list
        setDeletedRecords(prev => 
          prev.filter(record => record.id !== recordToRestore.id)
        );
        toast({
          title: "Επιτυχής ανάκτηση",
          description: "Η εγγραφή ανακτήθηκε με επιτυχία.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error(`Error restoring record:`, error);
      toast({
        title: "Σφάλμα",
        description: "Υπήρξε πρόβλημα κατά την ανάκτηση της εγγραφής.",
        variant: "destructive",
      });
    } finally {
      setShowRestoreDialog(false);
      setRecordToRestore(null);
    }
  };

  // Function to restore multiple records
  const handleBatchRestore = async () => {
    if (selectedRecords.length === 0) return;
    
    setIsRestoring(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      // Process each selected record
      for (const recordId of selectedRecords) {
        const { data, error } = await supabase
          .rpc('restore_deleted_record', { 
            table_name: activeTab,
            record_id: recordId
          });
          
        if (error) {
          failCount++;
          console.error(`Error restoring record ${recordId}:`, error);
        } else if (data) {
          successCount++;
        }
      }
      
      // Update the UI
      if (successCount > 0) {
        // Remove the restored records from the list
        setDeletedRecords(prev => 
          prev.filter(record => !selectedRecords.includes(record.id))
        );
        
        // Clear selection
        setSelectedRecords([]);
        
        toast({
          title: "Επιτυχής ανάκτηση",
          description: `${successCount} εγγραφές ανακτήθηκαν με επιτυχία.${failCount > 0 ? ` ${failCount} εγγραφές απέτυχαν.` : ''}`,
          variant: "default",
        });
      } else if (failCount > 0) {
        toast({
          title: "Σφάλμα",
          description: "Υπήρξε πρόβλημα κατά την ανάκτηση των εγγραφών.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error in batch restore:`, error);
      toast({
        title: "Σφάλμα",
        description: "Υπήρξε πρόβλημα κατά την ανάκτηση των εγγραφών.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      setShowBatchRestoreDialog(false);
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
      
      setDeletedRecords(data || []);
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

  // Toggle selection of a record
  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // Toggle selection of all records
  const toggleSelectAll = () => {
    if (selectedRecords.length === deletedRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(deletedRecords.map(record => record.id));
    }
  };
  
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
      
      <Card className="mb-6 bg-[#354f52] border-[#52796f]">
        <CardContent className="p-6">
          <p className="text-sm text-[#cad2c5] mb-4">
            Εδώ μπορείτε να δείτε και να ανακτήσετε εγγραφές που έχουν διαγραφεί τις τελευταίες 30 ημέρες.
            Μετά από 30 ημέρες, οι διαγραμμένες εγγραφές διαγράφονται οριστικά από το σύστημα.
          </p>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="text-[#cad2c5]">
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
                    <h2 className="text-lg font-semibold text-[#cad2c5]">Διαγραμμένα {table.name}</h2>
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
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="h-2 w-2 bg-[#84a98c] rounded-full animate-bounce" />
                      <div className="h-2 w-2 bg-[#84a98c] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="h-2 w-2 bg-[#84a98c] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                ) : deletedRecords.length === 0 ? (
                  <div className="text-center py-8 text-[#84a98c]">
                    Δεν υπάρχουν διαγραμμένες εγγραφές για αυτόν τον τύπο.
                  </div>
                ) : (
                  <div className="rounded-md border border-[#52796f] overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#2f3e46]">
                        <TableRow className="hover:bg-[#2f3e46]/80 border-b border-[#52796f]">
                          <TableHead className="w-[50px] text-[#cad2c5]">
                            <Checkbox 
                              checked={selectedRecords.length === deletedRecords.length && deletedRecords.length > 0} 
                              onCheckedChange={toggleSelectAll}
                              className="border-[#84a98c] data-[state=checked]:bg-[#52796f] data-[state=checked]:text-[#cad2c5]"
                            />
                          </TableHead>
                          <TableHead className="text-[#cad2c5]">Στοιχεία</TableHead>
                          <TableHead className="text-[#cad2c5]">Διαγράφηκε</TableHead>
                          <TableHead className="w-[100px] text-right text-[#cad2c5]">Ενέργειες</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedRecords.map(record => (
                          <TableRow 
                            key={record.id} 
                            className="hover:bg-[#2f3e46]/60 border-b border-[#52796f] bg-[#2f3e46]/30"
                          >
                            <TableCell>
                              <Checkbox 
                                checked={selectedRecords.includes(record.id)} 
                                onCheckedChange={() => toggleRecordSelection(record.id)}
                                className="border-[#84a98c] data-[state=checked]:bg-[#52796f] data-[state=checked]:text-[#cad2c5]"
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-[#cad2c5] flex items-center">
                                  {getRecordTitle(record.record, table.id)}
                                  <Badge className="ml-2 bg-[#52796f] text-[#cad2c5]">
                                    Διαγραμμένο
                                  </Badge>
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
      
      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className="bg-[#354f52] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Επιβεβαίωση Ανάκτησης</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Είστε βέβαιοι ότι θέλετε να ανακτήσετε αυτή την εγγραφή;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2f3e46] text-[#cad2c5] hover:bg-[#2f3e46]/80 border-[#52796f]">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestore}
              className="bg-[#52796f] hover:bg-[#52796f]/80 text-[#cad2c5]"
            >
              Ανάκτηση
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Batch Restore Confirmation Dialog */}
      <AlertDialog open={showBatchRestoreDialog} onOpenChange={setShowBatchRestoreDialog}>
        <AlertDialogContent className="bg-[#354f52] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Επιβεβαίωση Μαζικής Ανάκτησης</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Είστε βέβαιοι ότι θέλετε να ανακτήσετε {selectedRecords.length} επιλεγμένες εγγραφές;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2f3e46] text-[#cad2c5] hover:bg-[#2f3e46]/80 border-[#52796f]">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBatchRestore}
              className="bg-[#52796f] hover:bg-[#52796f]/80 text-[#cad2c5]"
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <div className="h-4 w-4 border-2 border-[#cad2c5] border-t-transparent rounded-full animate-spin mr-2" />
                  Ανάκτηση...
                </>
              ) : (
                <>Ανάκτηση</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Purge Confirmation Dialog */}
      <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <AlertDialogContent className="bg-[#354f52] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Επιβεβαίωση Εκκαθάρισης</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Αυτή η ενέργεια θα διαγράψει οριστικά όλες τις εγγραφές που έχουν διαγραφεί πριν από 30 ημέρες.
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Θέλετε να συνεχίσετε;
            </AlertDialogDescription>
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
    </div>
  );
} 