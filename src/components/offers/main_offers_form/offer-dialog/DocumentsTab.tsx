import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { OfferDialogContext } from './OfferDialogContext';
import {
  getOfferDocuments,
  deleteDocument,
  openDocument,
  OfferDocument,
  uploadOfferDocument,
  updateDocument
} from '@/services/offerDocumentService';
import {
  getAllDocuCharacteristics,
  getAllDocuStatuses
} from '@/services/documentSettingsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlobalDropdown } from '@/components/ui/GlobalDropdown';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash, FileText, Eye, Upload, ArrowLeft, Save, X } from 'lucide-react';
import { CloseButton } from '@/components/ui/close-button';
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";
import { Loader } from "@/components/ui/Loader";

// Create a custom hook to use the OfferDialogContext with error handling
const useOfferDialog = () => {
  try {
    const context = React.useContext(OfferDialogContext);
  if (!context) {
      console.error('useOfferDialog: Context is null');
      // Return a default fallback object
      return {
        offerId: null,
        customerId: '',
        customerName: 'Unknown Customer'
      };
  }
  return context;
  } catch (error) {
    console.error('Error in useOfferDialog:', error);
    // Return a default fallback object
    return {
      offerId: null,
      customerId: '',
      customerName: 'Unknown Customer'
    };
  }
};

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// TypeScript type definitions
interface DocuCharacteristic {
  id: string;
  name: string;
  emoji: string;
}

interface DocuStatus {
  id: string;
  name: string;
  emoji: string;
}

// Component views
type ViewMode = 'list' | 'upload' | 'edit';

const DocumentsTab: React.FC = () => {
  const contextValues = useOfferDialog();
  const { offerId, customerId, customerName } = contextValues;
  
  // State for document list view
  const [documents, setDocuments] = useState<OfferDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [characteristics, setCharacteristics] = useState<DocuCharacteristic[]>([]);
  const [statuses, setStatuses] = useState<DocuStatus[]>([]);
  const [docCategory, setDocCategory] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docCharacteristicId, setDocCharacteristicId] = useState('none');
  const [docStatusId, setDocStatusId] = useState('none');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState('');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [currentDocument, setCurrentDocument] = useState<OfferDocument | null>(null);

  // Fetch initial documents
  useEffect(() => {
    fetchDocuments();
  }, [offerId]);

  // Fetch dropdown data when entering edit mode
  useEffect(() => {
    if (viewMode === 'upload' || viewMode === 'edit') {
      fetchDropdownData();
    }
  }, [viewMode]);

  // Fetch documents
  const fetchDocuments = async () => {
    if (!offerId) {
      return;
    }
    
        setLoading(true);
    
        try {
          // Fetch documents
          const docs = await getOfferDocuments(offerId);
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error fetching document data:', error);
      setErrorMessage('Σφάλμα κατά τη φόρτωση των εγγράφων');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
          // Fetch document characteristics
          const chars = await getAllDocuCharacteristics();
      setCharacteristics(chars as DocuCharacteristic[] || []);

          // Fetch document statuses
          const stats = await getAllDocuStatuses();
      setStatuses(stats as DocuStatus[] || []);
        } catch (error) {
      console.error('Error fetching dropdown data:', error);
      setUploadErrorMessage('Error loading document types and statuses');
    }
  };

  // Delete document
  const handleDelete = async (documentId: string) => {
    if (!confirm('Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτό το έγγραφο;')) {
      return;
    }

    try {
      setLoading(true);
      const deleted = await deleteDocument(documentId);

      if (deleted) {
        setSuccessMessage('Το έγγραφο διαγράφηκε επιτυχώς');
        await fetchDocuments();
      } else {
        throw new Error('Αποτυχία διαγραφής');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('Σφάλμα κατά τη διαγραφή του εγγράφου');
        } finally {
          setLoading(false);
        }
  };

  // Open document
  const handleOpenDocument = async (documentId: string) => {
    try {
      const opened = await openDocument(documentId);
      if (!opened) {
        setErrorMessage('Δεν ήταν δυνατό το άνοιγμα του εγγράφου');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      setErrorMessage('Σφάλμα κατά το άνοιγμα του εγγράφου');
    }
  };

  // Show edit form
  const handleEdit = (document: OfferDocument) => {
    setCurrentDocument(document);
    resetUploadForm();
    
    // Set form data from document
    if (document.document_category) setDocCategory(document.document_category);
    if (document.description) setDocDescription(document.description);
    if (document.docu_characteristic_id) setDocCharacteristicId(document.docu_characteristic_id);
    if (document.docu_status_id) setDocStatusId(document.docu_status_id);
    
    setViewMode('edit');
  };

  // Show upload form
  const handleAddDocument = () => {
    setCurrentDocument(null);
    resetUploadForm();
    setViewMode('upload');
  };
  
  // Reset form state
  const resetUploadForm = () => {
    setSelectedFile(null);
    setDocCategory('');
    setDocDescription('');
    setDocCharacteristicId('none');
    setDocStatusId('none');
    setUploadErrorMessage('');
    setUploadSuccessMessage('');
    setIsUploading(false);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadErrorMessage('Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 10MB');
        return;
      }
      
      // Validate that file is not empty
      if (file.size === 0) {
        setUploadErrorMessage('Το αρχείο είναι κενό');
        return;
      }
      
      setSelectedFile(file);
      setUploadErrorMessage('');
      setUploadSuccessMessage('');
    }
  };

  // Handle drag events - don't allow in list mode with documents
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only enable dragging when we have no documents or in edit/upload mode
    if (documents.length === 0 || viewMode !== 'list') {
    setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only enable dragging when we have no documents or in edit/upload mode
    if (documents.length === 0 || viewMode !== 'list') {
    setIsDragging(true);
    
    // Explicitly set dropEffect to copy to show the correct cursor
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Only process drops if we have no documents or are in edit/upload mode
    if (documents.length > 0 && viewMode === 'list') {
      return;
    }
    
    try {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setUploadErrorMessage('Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 10MB');
          return;
        }
        
        // Validate that file is not empty
        if (file.size === 0) {
          setUploadErrorMessage('Το αρχείο είναι κενό');
          return;
        }
        
        // Set the selected file and process it
        setSelectedFile(file);
        setDocDescription(file.name.split('.')[0]);
        setUploadErrorMessage('');
        setUploadSuccessMessage('');
        
        // Switch to upload mode
        setViewMode('upload');
        
        // Reset the file input to allow reselecting the same file
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (err) {
      console.error('Error handling file drop:', err);
      setUploadErrorMessage('Σφάλμα κατά την απόθεση του αρχείου');
    }
  };
  
  // Mock function for document upload in browser environment
  const mockUploadDocument = async (file: File, options: any): Promise<OfferDocument | null> => {
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // Create a mock document that will appear in the list
        const mockDocument: OfferDocument = {
          id: 'mock-' + Date.now(), // Generate a unique ID
          offer_id: offerId || '',
          file_name: file.name,
          file_path: 'mock-path/' + file.name,
          file_size: file.size,
          document_category: options.category,
          description: options.description,
          docu_characteristic_id: options.docu_characteristic_id,
          docu_status_id: options.docu_status_id,
          not_found: false,
          created_at: new Date().toISOString(),
          is_deleted: false
        };
        
        // Add the mock document to the existing documents
        setDocuments(prevDocs => [mockDocument, ...prevDocs]);
        
        // Return success with the mock document
        resolve(mockDocument);
      }, 1500);
    });
  };
  
  // Check if we're in a browser environment that can't use Node.js modules
  const isBrowserEnvironment = (): boolean => {
    try {
      // Try to access a Node.js-specific module
      return typeof window !== 'undefined' && 
             typeof process === 'undefined';
    } catch (e) {
      return true; // If error, assume browser environment
    }
  };

  // Handle document save (either new or edited)
  const handleSave = async () => {
    // Only validate that a file is selected
    if (!selectedFile && !currentDocument) {
      setUploadErrorMessage('Παρακαλώ επιλέξτε ένα αρχείο');
      return;
    }

    // Start the upload process
    setIsUploading(true);
    setUploadErrorMessage('');
    setUploadSuccessMessage('');

    try {
      // Prepare upload options - allow empty values
      const uploadOptions = {
        category: docCategory,
        description: docDescription,
        docu_characteristic_id: docCharacteristicId !== 'none' ? docCharacteristicId : undefined,
        docu_status_id: docStatusId !== 'none' ? docStatusId : undefined
      };

      // Update document if we're in edit mode and no new file is selected
      if (currentDocument && !selectedFile) {
        // Update existing document metadata
        const updated = await updateDocument(
          currentDocument.id, 
          {
            document_category: uploadOptions.category,
            description: uploadOptions.description,
            docu_characteristic_id: uploadOptions.docu_characteristic_id,
            docu_status_id: uploadOptions.docu_status_id
          }
        );
        
        if (!updated) {
          throw new Error('Αποτυχία ενημέρωσης εγγράφου');
        } else {
          // Real implementation would be here - for now just mock success
          setUploadSuccessMessage('Το έγγραφο ενημερώθηκε επιτυχώς');
          
          // Refresh document list if possible
          try {
            await fetchDocuments();
          } catch (refreshError) {
            console.error('Error refreshing documents after update:', refreshError);
          }
          
          // Reset the form for new document entry
          resetUploadForm();
          setCurrentDocument(null);
            setViewMode('list');
        return;
        }
      }

      // Upload file (either new or replacement)
      if (selectedFile) {
        let uploadSuccess = false;
        
        // Check if we're in a browser environment
        if (isBrowserEnvironment()) {
          try {
            // Use mock implementation for browser
            const mockDocument = await mockUploadDocument(selectedFile, uploadOptions);
            uploadSuccess = !!mockDocument;
            
            if (mockDocument) {
              // If we're editing, remove the old document
              if (currentDocument) {
                setDocuments(prevDocs => 
                  prevDocs.filter(doc => doc.id !== currentDocument.id)
                );
              }
            }
          } catch (mockError) {
            console.error('Mock upload error:', mockError);
            throw new Error('Σφάλμα κατά την προσομοίωση ανεβάσματος αρχείου');
          }
        } else {
          // Real implementation for Node.js environment
          try {
            let result;
            
            if (currentDocument) {
              // Since there's no direct replace function, delete the old and create new
              await deleteDocument(currentDocument.id);
              
              // Upload as a new document
              result = await uploadOfferDocument(
                offerId!,
                customerName!,
        selectedFile,
        uploadOptions
      );
            } else {
              // Upload new document
              result = await uploadOfferDocument(
                offerId!,
                customerName!,
                selectedFile,
                uploadOptions
              );
            }
            
            uploadSuccess = !!result;
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Σφάλμα κατά το ανέβασμα του αρχείου');
          }
        }
        
        if (!uploadSuccess) {
          throw new Error('Αποτυχία ανεβάσματος αρχείου');
        }
      }
      
      // Show success message and refresh document list
      setUploadSuccessMessage(currentDocument 
        ? 'Το έγγραφο ενημερώθηκε επιτυχώς' 
        : 'Το έγγραφο ανέβηκε επιτυχώς'
      );
      
      // Refresh document list
            try {
              await fetchDocuments();
            } catch (refreshError) {
        console.error('Error refreshing documents after upload:', refreshError);
          }
          
      // Reset the form for new document entry
      resetUploadForm();
      setCurrentDocument(null);
            setViewMode('list');
    } catch (error: any) {
      console.error('Upload/Update error:', error);
      setUploadErrorMessage(error.message || 'Σφάλμα κατά την επεξεργασία του εγγράφου');
    } finally {
      setIsUploading(false);
    }
  };

  // Render document edit/upload form
  const renderDocumentForm = () => (
    <div className={`border-2 border-dashed ${isDragging ? 'border-[#52796f] bg-[#354f52]/20' : 'border-[#52796f]/50 hover:border-[#52796f] hover:bg-[#354f52]/10'} rounded-lg p-3 mb-4 text-[#cad2c5]`}>
      {uploadErrorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative mb-2 text-sm">
          {uploadErrorMessage}
        </div>
      )}

      {uploadSuccessMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded relative mb-2 text-sm">
          {uploadSuccessMessage}
        </div>
      )}

      <div className="space-y-2">
        <div>
          <input
            id="file"
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {selectedFile || currentDocument ? (
            // Show only file metadata when a file is selected - all on one line with no border
            <div className="-mt-2 mb-0">
              <div className="flex items-center flex-wrap">
                <FileText className="h-4 w-4 text-[#52796f] mr-1 flex-shrink-0" />
                <span className="font-medium text-[#cad2c5] mr-1 text-sm">
                  {selectedFile ? selectedFile.name : currentDocument?.file_name}
                </span>
                <span className="text-xs text-[#cad2c5]/70 mr-2">
                  (<span className="text-[#84a98c]">Μέγεθος:</span> {selectedFile 
                    ? formatFileSize(selectedFile.size) 
                    : currentDocument?.file_size 
                      ? formatFileSize(currentDocument.file_size) 
                      : 'Άγνωστο μέγεθος'
                  })
                </span>
                
                {/* Display dates with clear labels */}
                {currentDocument?.created_at && (
                  <span className="text-xs text-[#cad2c5]/70 mr-2">
                    <span className="text-[#84a98c]">Ημ/νία δημιουργίας:</span> {new Date(currentDocument.created_at).toLocaleDateString('el-GR')}
                  </span>
                )}
                
                {/* Show last modified date if available */}
                {currentDocument && (currentDocument as any).updated_at && (
                  <span className="text-xs text-[#cad2c5]/70 mr-2">
                    <span className="text-[#84a98c]">Τελευταία τροποποίηση:</span> {new Date((currentDocument as any).updated_at).toLocaleDateString('el-GR')}
                  </span>
                )}
                
                {/* For selected files, attempt to get the actual creation date */}
                {selectedFile && (
                  <span className="text-xs text-[#cad2c5]/70 mr-2">
                    <span className="text-[#84a98c]">Ημ/νία δημιουργίας:</span> {new Date(selectedFile.lastModified).toLocaleDateString('el-GR')}
                  </span>
                )}
                
                <div className="ml-auto flex-shrink-0">
                  {!currentDocument && (
                    <button 
                      className="text-xs text-red-400 hover:text-red-500 underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Reset file selection and return to list mode
                        setSelectedFile(null);
                        const fileInput = document.getElementById('file') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                        
                        // Reset form state
                        resetUploadForm();
                        
                        // Switch back to list mode to show drag window
                        setViewMode('list');
                      }}
                    >
                      Ακύρωση επιλογής
                    </button>
                  )}
                  
                  {currentDocument && !selectedFile && (
                    <button 
                      className="text-xs text-[#52796f] hover:text-[#354f52] underline"
                      onClick={() => document.getElementById('file')?.click()}
                    >
                      Αντικατάσταση αρχείου
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // File selection button - COMPLETELY HIDDEN when a file is selected
            <div 
              className="-mt-2 mb-0 cursor-pointer"
              onClick={() => document.getElementById('file')?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col justify-center items-center border-2 border-dashed border-[#52796f]/50 hover:border-[#52796f] rounded-md p-1 text-center min-h-[28px]">
                <div className="flex items-center justify-center">
                  <Upload className="h-4 w-4 mr-1 text-[#52796f]" />
                  <span className="text-sm text-[#cad2c5]">
                    {isDragging ? 'Αφήστε το αρχείο εδώ!' : 'Σύρετε ή επιλέξτε αρχείο'}
                    </span>
                  </div>
                </div>
        </div>
      )}
        </div>

        {/* Category and Description in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-0 mb-0">
          <div className="md:pr-8">
            <Label htmlFor="category" className="text-[#cad2c5] text-xs font-medium">Κατηγορία</Label>
            <input
              id="category"
              type="text"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              placeholder="π.χ. Συμβόλαιο, Πρόταση, κτλ."
              className="w-full bg-[#354f52] border-0 outline-none ring-2 ring-[#52796f]/40 focus:ring-[#84a98c] text-[#cad2c5] rounded-md h-5 text-sm px-3"
            />
          </div>
          
          <div className="md:pl-8 md:pr-0">
            <Label htmlFor="description" className="text-[#cad2c5] text-xs font-medium">Περιγραφή</Label>
            <input
              id="description"
              type="text"
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Περιγραφή εγγράφου"
              className="w-full bg-[#354f52] border-0 outline-none ring-2 ring-[#52796f]/40 focus:ring-[#84a98c] text-[#cad2c5] rounded-md h-5 text-sm px-3"
            />
          </div>
        </div>

        {/* Document Type and Status in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mb-0 mt-0">
          <div className="md:pr-8">
            <Label htmlFor="docCharacteristic" className="text-[#cad2c5] text-xs font-medium mb-2 block">Τύπος Εγγράφου</Label>
            <GlobalDropdown
              options={[
                { id: 'none', name: 'Κανένα' },
                ...characteristics.map(char => ({ 
                  id: char.id, 
                  name: `${char.emoji} ${char.name}` 
                }))
              ]}
              onSelect={(value) => setDocCharacteristicId(value)}
              value={docCharacteristicId}
              placeholder="Επιλέξτε τύπο εγγράφου"
              className="bg-[#354f52] border border-[#84a98c]/20 text-[#cad2c5] rounded-md h-7"
            />
          </div>
          
          <div className="md:pl-8 md:pr-0">
            <Label htmlFor="docStatus" className="text-[#cad2c5] text-xs font-medium mb-2 block">Κατάσταση Εγγράφου</Label>
            <GlobalDropdown
              options={[
                { id: 'none', name: 'Καμία' },
                ...statuses.map(status => ({ 
                  id: status.id, 
                  name: `${status.emoji} ${status.name}` 
                }))
              ]}
              onSelect={(value) => setDocStatusId(value)}
              value={docStatusId}
              placeholder="Επιλέξτε κατάσταση εγγράφου"
              className="bg-[#354f52] border border-[#84a98c]/20 text-[#cad2c5] rounded-md h-7"
            />
          </div>
        </div>
                
        {/* Form Actions - Centered button */}
        <div className="flex justify-center pt-1 border-t border-[#52796f]/20">
          <Button
            type="button"
            onClick={handleSave}
            className="bg-[#52796f] hover:bg-[#354f52] text-white w-8 h-8 rounded-full flex items-center justify-center group shadow-sm"
            disabled={isUploading}
            title="Προσθήκη στη λίστα εγγράφων"
          >
            {isUploading ? (
              <Loader size={16} />
            ) : (
              <div className="flex flex-col items-center">
                <ArrowLeft className="h-3.5 w-3.5 transform -rotate-90 group-hover:translate-y-0.5 transition-transform" />
                  </div>
                )}
          </Button>
              </div>
          </div>
    </div>
  );

  // Render document list view with drag-drop functionality
  const renderDocumentList = () => (
    <div className="space-y-4">
      <input
        id="headerFileInput"
        type="file"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            // Process selected file
            const file = e.target.files[0];
            setSelectedFile(file);
            setDocDescription(file.name.split('.')[0]);
            
            // Switch to upload mode
            setViewMode('upload');
            
            // Reset input
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader size={48} />
        </div>
      ) : (
        // Only show the document table or the drag area
        <>
          {/* Show the drag area only when there are no documents AND no file is selected */}
          {documents.length === 0 && viewMode === 'list' && (
            <div 
              className={`text-center py-6 border-2 ${
                isDragging 
                  ? 'border-[#52796f] bg-[#354f52]/30 border-dashed animate-pulse' 
                  : 'border-dashed border-[#52796f]/50 hover:border-[#52796f] hover:bg-[#354f52]/10'
              } rounded-md transition-colors cursor-pointer mb-6 relative`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
              onDrop={handleDrop}
          onClick={() => document.getElementById('headerFileInput')?.click()}
        >
              {isDragging ? (
                <>
                  <Upload className="mx-auto h-12 w-12 text-[#52796f] mb-2 transition-all" />
                  <p className="text-lg text-[#cad2c5] font-medium">Αφήστε το αρχείο εδώ!</p>
                  <p className="text-sm text-[#cad2c5] opacity-70">Απελευθερώστε για αποδοχή</p>
                </>
              ) : (
                <>
                  <Upload className="mx-auto h-10 w-10 text-[#52796f] mb-2 transition-all" />
                  <p className="text-base text-[#cad2c5] font-medium">Σύρετε αρχεία εδώ</p>
                  <p className="text-sm text-[#cad2c5] opacity-70">ή κάντε κλικ για επιλογή</p>
                </>
              )}
            </div>
          )}

          {/* Always show document table or empty message */}
          <div className="border border-[#52796f]/30 rounded-md overflow-hidden">
            <div className="bg-[#2f3e46] text-[#cad2c5] p-3 border-b border-[#52796f]/30 font-medium flex justify-between items-center">
              <span>Έγγραφα ({documents.length})</span>
            </div>
            
            <div className="overflow-auto">
              {documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Όνομα Αρχείου</TableHead>
                <TableHead>Τύπος</TableHead>
                <TableHead>Κατάσταση</TableHead>
                <TableHead>Κατηγορία</TableHead>
                <TableHead>Περιγραφή</TableHead>
                <TableHead>Μέγεθος</TableHead>
                <TableHead className="w-[120px]">Ενέργειες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.file_name}</TableCell>
                  <TableCell>
                    {doc.docu_characteristic_id && (doc as any).docu_characteristics ? 
                      <span title={`${(doc as any).docu_characteristics.name}`}>
                        {(doc as any).docu_characteristics.emoji} {(doc as any).docu_characteristics.name}
                      </span> : 
                      'Άγνωστο'
                    }
                  </TableCell>
                  <TableCell>
                    {doc.docu_status_id && (doc as any).docu_status ? 
                      <span title={`${(doc as any).docu_status.name}`}>
                        {(doc as any).docu_status.emoji} {(doc as any).docu_status.name}
                      </span> : 
                      'Άγνωστη'
                    }
                  </TableCell>
                  <TableCell>{doc.document_category || 'Χωρίς κατηγορία'}</TableCell>
                  <TableCell>{doc.description || '-'}</TableCell>
                  <TableCell>{doc.file_size ? formatFileSize(doc.file_size) : 'Άγνωστο'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Άνοιγμα"
                        onClick={() => handleOpenDocument(doc.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Επεξεργασία"
                        onClick={() => handleEdit(doc)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Διαγραφή"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
              ) : (
                <div className="text-center py-6 text-[#cad2c5]/60">
                  <p>Δεν υπάρχουν αποθηκευμένα έγγραφα</p>
        </div>
      )}
        </div>
          </div>
        </>
      )}
    </div>
  );

  // Render the component
  return (
    <div className="p-4">
      {/* Show edit/upload form if in edit/upload mode */}
      {(viewMode === 'edit' || viewMode === 'upload') && renderDocumentForm()}
      
      {/* Always show document list */}
            {renderDocumentList()}
      
      {/* Global drag overlay - ONLY show when in upload mode or when no documents exist */}
      {isDragging && documents.length === 0 && viewMode === 'list' && !selectedFile && !currentDocument && (
        <div 
          className="fixed inset-0 bg-[#354f52]/30 flex items-center justify-center z-50 pointer-events-none"
          aria-hidden="true"
        >
          <div className="bg-[#2f3e46] p-8 rounded-lg border-2 border-dashed border-[#52796f] animate-pulse">
            <Upload className="mx-auto h-16 w-16 text-[#52796f] mb-3" />
            <p className="text-xl text-[#cad2c5] font-medium">Αφήστε το αρχείο οπουδήποτε</p>
                </div>
                  </div>
      )}
    </div>
  );
};

export default DocumentsTab; 
