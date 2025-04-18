import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/GlobalTooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableBase } from '@/components/ui/data-table-base';
import {
  getAllDocuCharacteristics,
  createDocuCharacteristic,
  updateDocuCharacteristic,
  deleteDocuCharacteristic,
  getAllDocuStatuses,
  createDocuStatus,
  updateDocuStatus,
  deleteDocuStatus,
  updateDocumentPath,
  getDocumentPath,
  validatePath,
  DocuCharacteristic,
  DocuStatus
} from '@/services/documentSettingsService';
import { Pencil, Trash2, PlusCircle, Check, X, Plus, Save, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/utils/formatUtils';

interface DialogState {
  isOpen: boolean;
  isEdit: boolean;
  dialogType: 'characteristic' | 'status' | 'none';
  currentItem: DocuCharacteristic | DocuStatus | null;
}

export function DocumentSettingsTab() {
  const [characteristics, setCharacteristics] = useState<DocuCharacteristic[]>([]);
  const [statuses, setStatuses] = useState<DocuStatus[]>([]);
  const [documentPath, setDocumentPath] = useState('');
  const [isPathValid, setIsPathValid] = useState<boolean | null>(null);
  const [pathMessage, setPathMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Status message state
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });
  
  // Form states
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📄');
  
  // Dialog state
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    isEdit: false,
    dialogType: 'none',
    currentItem: null
  });
  
  useEffect(() => {
    fetchDocumentSettings();
  }, []);
  
  const fetchDocumentSettings = async () => {
    setLoading(true);
    try {
      // Fetch all the settings in parallel
      const [characteristicsData, statusesData, pathData] = await Promise.all([
        getAllDocuCharacteristics(),
        getAllDocuStatuses(),
        getDocumentPath()
      ]);
      
      setCharacteristics(characteristicsData);
      setStatuses(statusesData);
      setDocumentPath(pathData);
      
      if (pathData) {
        validateDocumentPath(pathData);
      }
    } catch (error) {
      console.error('Error fetching document settings:', error);
      setStatusMessage({ 
        type: 'error', 
        message: 'Σφάλμα φόρτωσης ρυθμίσεων εγγράφων.' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const validateDocumentPath = async (path: string) => {
    if (!path) {
      setIsPathValid(null);
      setPathMessage('');
      return;
    }
    
    // Normalize path - replace forward slashes with backslashes and remove any double backslashes
    let normalizedPath = path.replace(/\//g, '\\').replace(/\\\\/g, '\\');
    
    // Enhanced Windows path regex validation
    const windowsPathRegex = /^[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/;
    
    if (windowsPathRegex.test(normalizedPath)) {
      setIsPathValid(true);
      setPathMessage('Η διαδρομή φαίνεται έγκυρη. Το σύστημα θα επιβεβαιώσει την πρόσβαση κατά τη χρήση.');
      
      // If we normalized the path, update the input field
      if (normalizedPath !== path) {
        setDocumentPath(normalizedPath);
      }
    } else {
      setIsPathValid(false);
      setPathMessage('Η διαδρομή δεν είναι έγκυρη. Παρακαλώ χρησιμοποιήστε μια έγκυρη διαδρομή Windows (π.χ. C:\\KFlow\\Documents).');
    }
  };
  
  const handleSaveDocumentPath = async () => {
    setLoading(true);
    try {
      // Normalize the path by adding a trailing backslash if not present
      let normalizedPath = documentPath.replace(/\//g, '\\').replace(/\\\\/g, '\\');
      normalizedPath = normalizedPath.endsWith('\\') ? normalizedPath : `${normalizedPath}\\`;
      
      // Save the path without checking if it exists (browser can't check the filesystem)
      await updateDocumentPath(normalizedPath);
      setDocumentPath(normalizedPath);
      setIsPathValid(true);
      setPathMessage('Η διαδρομή αποθηκεύτηκε επιτυχώς. Η πρόσβαση στον φάκελο θα επαληθευτεί κατά τη χρήση.');
    } catch (error) {
      // Log detailed error information for debugging
      console.error('Error updating document path:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Log any additional properties on the error object
        const errorObj = error as any;
        if (errorObj.status) console.error('Error status:', errorObj.status);
        if (errorObj.code) console.error('Error code:', errorObj.code);
        if (errorObj.details) console.error('Error details:', errorObj.details);
      }
      
      setIsPathValid(false);
      
      // Check for Supabase conflict error
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage.includes('409') || (error as any).status === 409) {
          setPathMessage('Σφάλμα σύγκρουσης δεδομένων. Δοκιμάστε να ανανεώσετε τη σελίδα και προσπαθήστε ξανά.');
        } else {
          setPathMessage(`Σφάλμα κατά την αποθήκευση: ${errorMessage}`);
        }
      } else {
        setPathMessage('Άγνωστο σφάλμα κατά την αποθήκευση της διαδρομής.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Open dialog for create/edit
  const openDialog = (type: 'characteristic' | 'status', isEdit: boolean, item?: DocuCharacteristic | DocuStatus) => {
    setDialog({
      isOpen: true,
      isEdit,
      dialogType: type,
      currentItem: item || null
    });
    
    if (item) {
      setName(item.name);
      setEmoji(item.emoji || '📄');
    } else {
      resetForm();
    }
  };
  
  const resetForm = () => {
    setName('');
    setEmoji('📄');
  };
  
  const closeDialog = () => {
    setDialog({
      isOpen: false,
      isEdit: false,
      dialogType: 'none',
      currentItem: null
    });
    resetForm();
  };
  
  // Handle form submission for characteristic or status
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      setStatusMessage({ type: 'error', message: 'Το όνομα είναι υποχρεωτικό.' });
      return;
    }
    
    setLoading(true);
    try {
      if (dialog.dialogType === 'characteristic') {
        // Handle characteristic operations
        if (dialog.isEdit && dialog.currentItem) {
          await updateDocuCharacteristic(dialog.currentItem.id, { name, emoji });
          setStatusMessage({ type: 'success', message: 'Ο τύπος εγγράφου ενημερώθηκε επιτυχώς.' });
        } else {
          await createDocuCharacteristic({ name, emoji });
          setStatusMessage({ type: 'success', message: 'Ο τύπος εγγράφου δημιουργήθηκε επιτυχώς.' });
        }
        
        // Refresh characteristics
        const updated = await getAllDocuCharacteristics();
        setCharacteristics(updated);
      } else if (dialog.dialogType === 'status') {
        // Handle status operations
        if (dialog.isEdit && dialog.currentItem) {
          await updateDocuStatus(dialog.currentItem.id, { name, emoji });
          setStatusMessage({ type: 'success', message: 'Η κατάσταση εγγράφου ενημερώθηκε επιτυχώς.' });
        } else {
          await createDocuStatus({ name, emoji });
          setStatusMessage({ type: 'success', message: 'Η κατάσταση εγγράφου δημιουργήθηκε επιτυχώς.' });
        }
        
        // Refresh statuses
        const updated = await getAllDocuStatuses();
        setStatuses(updated);
      }
      
      closeDialog();
    } catch (error) {
      console.error('Error saving item:', error);
      setStatusMessage({ type: 'error', message: 'Σφάλμα κατά την αποθήκευση.' });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle delete for characteristic or status
  const handleDelete = async (type: 'characteristic' | 'status', id: string) => {
    if (!confirm('Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτό το στοιχείο;')) {
      return;
    }
    
    setLoading(true);
    try {
      if (type === 'characteristic') {
        await deleteDocuCharacteristic(id);
        setStatusMessage({ type: 'success', message: 'Ο τύπος εγγράφου διαγράφηκε επιτυχώς.' });
        
        // Refresh characteristics
        const updated = await getAllDocuCharacteristics();
        setCharacteristics(updated);
      } else {
        await deleteDocuStatus(id);
        setStatusMessage({ type: 'success', message: 'Η κατάσταση εγγράφου διαγράφηκε επιτυχώς.' });
        
        // Refresh statuses
        const updated = await getAllDocuStatuses();
        setStatuses(updated);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setStatusMessage({ type: 'error', message: 'Σφάλμα κατά τη διαγραφή.' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="px-2 py-2 bg-[#2f3e46] text-[#cad2c5]">
      {statusMessage.message && (
        <div className={`p-3 mb-4 rounded-md ${
          statusMessage.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {statusMessage.message}
        </div>
      )}
      
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#a8c5b5] mb-2">Ρυθμίσεις Εγγράφων</h1>
          <p className="text-[#84a98c]">Διαχειριστείτε τις ρυθμίσεις για τα έγγραφα προσφορών και πελατών</p>
        </div>
      </div>
      
      {/* Form Sections */}
      <div className="space-y-4 max-w-6xl">
        {/* Document Path Section */}
        <div className="w-full bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
          <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
            <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
              ΔΙΑΔΡΟΜΗ ΕΓΓΡΑΦΩΝ
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {/* Document Path Text Field */}
              <div className="space-y-2">
                <div>
                  <Input
                    id="documentPath"
                    value={documentPath}
                    onChange={(e) => {
                      const newPath = e.target.value;
                      setDocumentPath(newPath);
                      validateDocumentPath(newPath);
                    }}
                    className="w-full bg-[#2f3e46] border-0 focus:ring-1 focus:ring-[#52796f]"
                    placeholder="π.χ. C:\Documents\KFlow"
                  />
                </div>
                <p className="text-xs text-[#84a98c]">
                  Εισάγετε τη διαδρομή όπου θα αποθηκεύονται τα έγγραφα. Η ύπαρξη του φακέλου θα επαληθευτεί κατά τη χρήση.
                </p>
              </div>
              
              {/* Path validation message */}
              {(isPathValid !== null) && (
                <div className="flex items-center">
                  {isPathValid ? (
                    <div className="text-green-400 text-sm flex items-center gap-1">
                      <Check className="h-4 w-4" /> {pathMessage}
                    </div>
                  ) : (
                    <div className="text-red-400 text-sm flex items-center gap-1">
                      <X className="h-4 w-4" /> {pathMessage}
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-2 bg-[#2f3e46] rounded text-xs text-[#84a98c]">
                <p className="mb-1"><strong>Σημείωση:</strong> Ο περιηγητής δεν μπορεί να επαληθεύσει την ύπαρξη του φακέλου για λόγους ασφαλείας.</p>
                <p>Παρακαλώ βεβαιωθείτε ότι η διαδρομή που εισάγετε είναι σωστή και ο φάκελος υπάρχει στο σύστημα σας.</p>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-[#84a98c]">
                  Ο φάκελος όπου θα αποθηκεύονται τα έγγραφα του συστήματος.
                </p>
                <Button
                  onClick={handleSaveDocumentPath}
                  disabled={loading || documentPath === '' || isPathValid === false}
                  className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Αποθήκευση Ρυθμίσεων
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Two column layout for Document Types and Statuses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document Types Section */}
          <div className="w-full bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
            <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f] flex justify-between items-center">
              <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                ΤΥΠΟΙ ΕΓΓΡΑΦΩΝ
              </h2>
              <Button
                onClick={() => openDialog('characteristic', false)}
                size="sm"
                disabled={loading}
                className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300 border border-yellow-600 rounded-full flex items-center justify-center"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-2">
              <div style={{ maxHeight: '150px', overflow: 'auto' }} className="scrollbar-thin scrollbar-thumb-[#52796f] scrollbar-track-[#2f3e46]">
                <DataTableBase
                  columns={[
                    { 
                      header: "Emoji", 
                      accessor: "emoji",
                      width: "60px",
                      cell: (value: string) => <span className="text-xl">{value || "📄"}</span>
                    },
                    { header: "Όνομα", accessor: "name" }
                  ]}
                  data={characteristics}
                  isLoading={loading}
                  pageSize={characteristics.length > 100 ? 100 : characteristics.length}
                  showSearch={false}
                  onRowClick={(item) => openDialog('characteristic', true, item)}
                  rowClassName="cursor-pointer hover:bg-[#354f52]"
                  defaultSortColumn="name"
                  defaultSortDirection="asc"
                  emptyStateMessage="Δεν υπάρχουν τύποι εγγράφων."
                />
              </div>
            </div>
          </div>
          
          {/* Document Statuses Section */}
          <div className="w-full bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
            <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f] flex justify-between items-center">
              <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                ΚΑΤΑΣΤΑΣΕΙΣ ΕΓΓΡΑΦΩΝ
              </h2>
              <Button
                onClick={() => openDialog('status', false)}
                size="sm"
                disabled={loading}
                className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300 border border-yellow-600 rounded-full flex items-center justify-center"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-2">
              <div style={{ maxHeight: '150px', overflow: 'auto' }} className="scrollbar-thin scrollbar-thumb-[#52796f] scrollbar-track-[#2f3e46]">
                <DataTableBase
                  columns={[
                    { 
                      header: "Emoji", 
                      accessor: "emoji",
                      width: "60px",
                      cell: (value: string) => <span className="text-xl">{value || "📄"}</span>
                    },
                    { header: "Όνομα", accessor: "name" }
                  ]}
                  data={statuses}
                  isLoading={loading}
                  pageSize={statuses.length > 100 ? 100 : statuses.length}
                  showSearch={false}
                  onRowClick={(item) => openDialog('status', true, item)}
                  rowClassName="cursor-pointer hover:bg-[#354f52]"
                  defaultSortColumn="name"
                  defaultSortDirection="asc"
                  emptyStateMessage="Δεν υπάρχουν καταστάσεις εγγράφων."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog for adding/editing characteristics and statuses */}
      <Dialog 
        open={dialog.isOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent 
          className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-xl h-auto max-h-[90vh] overflow-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in fade-in-90 zoom-in-90 slide-in-from-bottom-10"
          aria-labelledby="dialog-title"
        >
          <DialogHeader>
            <DialogTitle id="dialog-title" className="text-[#84a98c] text-xl font-medium">
              {dialog.isEdit ? 'Επεξεργασία' : 'Προσθήκη'} {dialog.dialogType === 'characteristic' ? 'Τύπου Εγγράφου' : 'Κατάστασης Εγγράφου'}
            </DialogTitle>
            <DialogDescription className="text-[#a8c5b5]">
              {dialog.isEdit
                ? "Ενημερώστε τα στοιχεία."
                : "Συμπληρώστε τα στοιχεία."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emoji" className="text-[#a8c5b5]">Emoji</Label>
                <Input
                  id="emoji"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="Επιλέξτε ένα emoji"
                  className="bg-[#2f3e46] border-[#52796f] focus:ring-1 focus:ring-[#52796f]"
                />
                <p className="text-sm text-[#84a98c]">Παραδείγματα: 📄 📋 📝 📁 📂 🗂️ 📌 📎</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#a8c5b5]">Όνομα</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Εισάγετε ένα όνομα"
                  className="bg-[#2f3e46] border-[#52796f] focus:ring-1 focus:ring-[#52796f]"
                />
              </div>
            </div>
            
            {statusMessage.message && (
              <div className={`p-3 mt-2 rounded-md ${
                statusMessage.type === 'success' 
                  ? 'bg-green-900/50 text-green-200 border border-green-800' 
                  : 'bg-red-900/50 text-red-200 border border-red-800'
              }`}>
                {statusMessage.message}
              </div>
            )}
            
            <DialogFooter className="gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={closeDialog}
                type="button"
                className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52]"
              >
                Ακύρωση
              </Button>
              {dialog.isEdit && dialog.currentItem && dialog.dialogType !== 'none' && (
                <Button 
                  type="button"
                  disabled={loading}
                  onClick={() => handleDelete(dialog.dialogType as 'characteristic' | 'status', dialog.currentItem!.id)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Διαγραφή
                </Button>
              )}
              <Button 
                type="submit"
                disabled={loading || !name}
                className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Επεξεργασία...
                  </>
                ) : (
                  dialog.isEdit ? 'Ενημέρωση' : 'Προσθήκη'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
