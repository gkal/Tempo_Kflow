import { useState, useEffect, useRef } from 'react';
import { getCustomerDocuments, openDocument, saveFile, deleteDocument, DocumentReference } from '@/services/documentService';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Loader2, File, Trash2, Upload, FileText, FileImage, FileArchive } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
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
import { Loader } from "@/components/ui/Loader";

interface DocumentViewerProps {
  customerId: string;
  customerName: string;
}

export default function DocumentViewer({ customerId, customerName }: DocumentViewerProps) {
  const [documents, setDocuments] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentReference | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set up real-time subscription for document changes
  useEffect(() => {
    const subscription = supabase
      .channel('document_references-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_references',
          filter: `customer_id=eq.${customerId}`
        },
        () => {
          // Silently update the documents list
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [customerId]);

  // Fetch documents for the customer
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const documents = await getCustomerDocuments(customerId);
      setDocuments(documents);
      setError(null);
    } catch (error) {
      console.error('Error fetching customer documents:', error);
      setError('Δεν ήταν δυνατή η φόρτωση των εγγράφων.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [customerId]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await saveFile(customerId, customerName, file);
      }
      
      toast({
        title: "Επιτυχία",
        description: `${files.length} αρχεία αποθηκεύτηκαν με επιτυχία.`,
      });
      
      // Refresh document list
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Σφάλμα",
        description: "Παρουσιάστηκε πρόβλημα κατά την αποθήκευση των αρχείων.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle document click
  const handleDocumentClick = async (document: DocumentReference) => {
    try {
      await openDocument(document.id);
      toast({
        title: "Άνοιγμα Εγγράφου",
        description: "Το έγγραφο ανοίγει σε νέο παράθυρο ή καρτέλα.",
      });
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατό το άνοιγμα του αρχείου.",
        variant: "destructive",
      });
    }
  };

  // Handle document delete
  const handleDeleteClick = (document: DocumentReference, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent document opening
    setDocumentToDelete(document);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      await deleteDocument(documentToDelete.id);
      toast({
        title: "Επιτυχία",
        description: "Το έγγραφο διαγράφηκε με επιτυχία.",
      });
      
      // Refresh document list
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Σφάλμα",
        description: "Παρουσιάστηκε πρόβλημα κατά τη διαγραφή του εγγράφου.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirmation(false);
      setDocumentToDelete(null);
    }
  };

  // Render file icon based on type
  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-10 w-10 text-[#84a98c]" />;

    if (fileType.startsWith('image/')) {
      return <FileImage className="h-10 w-10 text-blue-400" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-400" />;
    } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) {
      return <FileArchive className="h-10 w-10 text-amber-400" />;
    } else {
      return <File className="h-10 w-10 text-[#84a98c]" />;
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Μη διαθέσιμο';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: el });
    } catch (e) {
      return 'Μη έγκυρη ημερομηνία';
    }
  };

  return (
    <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f] flex justify-between items-center">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΕΓΓΡΑΦΑ
        </h2>
        <div>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button 
            variant="ghost"
            size="sm"
            className="text-[#84a98c] hover:text-[#cad2c5] hover:bg-[#52796f]"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader size={16} className="mr-2" />
                Φόρτωση...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Προσθήκη εγγράφου
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <Loader size={32} />
        </div>
      ) : error ? (
        <div className="p-4 text-red-400">{error}</div>
      ) : documents.length === 0 ? (
        <div className="p-6 text-center text-[#84a98c]">
          <File className="h-10 w-10 mx-auto mb-2 text-[#84a98c]/50" />
          <p>Δεν υπάρχουν έγγραφα για αυτόν τον πελάτη.</p>
          <p className="text-sm mt-1">Προσθέστε ένα έγγραφο χρησιμοποιώντας το κουμπί "Προσθήκη εγγράφου".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col bg-[#354f52] rounded-md border border-[#52796f] overflow-hidden cursor-pointer hover:bg-[#3a5a40] transition-colors"
              onClick={() => handleDocumentClick(doc)}
            >
              <div className="p-3 flex items-center justify-between border-b border-[#52796f]">
                <div className="truncate flex-1 text-[#cad2c5] font-medium text-sm">
                  {doc.file_name}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#84a98c] hover:text-red-400 hover:bg-[#2f3e46]"
                  onClick={(e) => handleDeleteClick(doc, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-3 flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {doc.thumbnail ? (
                    <img
                      src={doc.thumbnail}
                      alt="Preview"
                      className="h-10 w-10 object-cover rounded-sm"
                    />
                  ) : (
                    getFileIcon(doc.file_type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#84a98c]">
                    {formatDate(doc.created_at)}
                  </div>
                  {doc.description && (
                    <div className="text-xs text-[#cad2c5] truncate mt-1">
                      {doc.description}
                    </div>
                  )}
                  <div className="text-xs text-[#84a98c] mt-1">
                    {(doc.file_size && doc.file_size > 0) 
                      ? `${Math.round(doc.file_size / 1024)} KB` 
                      : 'Άγνωστο μέγεθος'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Διαγραφή εγγράφου</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Είστε βέβαιοι ότι θέλετε να διαγράψετε το έγγραφο 
              <strong className="text-[#cad2c5] mx-1">
                {documentToDelete?.file_name || "το έγγραφο"}
              </strong>; 
              Η ενέργεια αυτή δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] hover:bg-[#52796f] text-[#cad2c5] border-[#52796f]">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
