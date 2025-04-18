import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { getAllDocuCharacteristics, getAllDocuStatuses } from '@/services/documentSettingsService';
import { uploadOfferDocument } from '@/services/offerDocumentService';
import { Loader } from "@/components/ui/Loader";

// Global state to keep the dialog open across re-renders and component unmounts
let globalIsOpen = false;
let globalOfferId: string | null = null;
let globalCustomerId: string | null = null;
let globalCustomerName: string | null = null;
let isWithinOfferDialog = false;
let onDocumentUploadedCallback: (() => void) | null = null;

// Define types
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

// Export this interface
export interface DocumentUploadDialogRef {
  openDialog: (
    offerId: string, 
    customerId: string, 
    customerName: string, 
    inOfferDialog?: boolean, 
    onDocumentUploaded?: (() => void) | null
  ) => void;
  closeDialog: () => void;
}

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Create a global portal container once
let portalContainer: HTMLDivElement | null = null;

if (typeof window !== 'undefined' && !document.getElementById('global-document-upload-dialog')) {
  portalContainer = document.createElement('div');
  portalContainer.id = 'global-document-upload-dialog';
  document.body.appendChild(portalContainer);
}

const DocumentUploadDialog = forwardRef<DocumentUploadDialogRef>((props, ref) => {
  // Local state
  const [isOpen, setIsOpen] = useState(globalIsOpen);
  const [offerId, setOfferId] = useState<string | null>(globalOfferId);
  const [customerId, setCustomerId] = useState<string | null>(globalCustomerId);
  const [customerName, setCustomerName] = useState<string | null>(globalCustomerName);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [characteristics, setCharacteristics] = useState<DocuCharacteristic[]>([]);
  const [statuses, setStatuses] = useState<DocuStatus[]>([]);
  const [docCategory, setDocCategory] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docCharacteristicId, setDocCharacteristicId] = useState('none');
  const [docStatusId, setDocStatusId] = useState('none');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isWithinOffer, setIsWithinOffer] = useState(isWithinOfferDialog);

  // Expose methods to ref
  useImperativeHandle(ref, () => ({
    openDialog: (
      offerId: string, 
      customerId: string, 
      customerName: string, 
      inOfferDialog = false, 
      onDocumentUploaded: (() => void) | null = null
    ) => {
      console.log('Global dialog opening for:', { offerId, customerId, customerName, inOfferDialog });
      globalIsOpen = true;
      globalOfferId = offerId;
      globalCustomerId = customerId;
      globalCustomerName = customerName;
      isWithinOfferDialog = inOfferDialog;
      onDocumentUploadedCallback = onDocumentUploaded;
      
      setIsOpen(true);
      setOfferId(offerId);
      setCustomerId(customerId);
      setCustomerName(customerName);
      setIsWithinOffer(inOfferDialog);
      resetForm();
      
      // Fetch data for dropdowns
      fetchDropdownData();
    },
    closeDialog: () => {
      console.log('Global dialog closing');
      globalIsOpen = false;
      isWithinOfferDialog = false;
      onDocumentUploadedCallback = null;
      
      setIsOpen(false);
      setIsWithinOffer(false);
      resetForm();
    }
  }));

  // Reset form
  const resetForm = () => {
    setSelectedFile(null);
    setDocCategory('');
    setDocDescription('');
    setDocCharacteristicId('none');
    setDocStatusId('none');
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      // Use static imports instead of dynamic imports
      const chars = await getAllDocuCharacteristics();
      setCharacteristics(chars as any[] || []);

      // Fetch document statuses
      const stats = await getAllDocuStatuses();
      setStatuses(stats as any[] || []);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      setErrorMessage('Error loading document types and statuses');
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage('');
      setSuccessMessage('');
    }
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMessage('');
      setSuccessMessage('');
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !offerId || !customerName) {
      setErrorMessage('Please select a file first');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      // Use static imports instead of dynamic imports
      // Upload options
      const uploadOptions = {
        category: docCategory,
        description: docDescription,
        docu_characteristic_id: docCharacteristicId === 'none' ? undefined : docCharacteristicId,
        docu_status_id: docStatusId === 'none' ? undefined : docStatusId
      };

      // Upload file
      const uploaded = await uploadOfferDocument(
        offerId,
        customerName,
        selectedFile,
        uploadOptions
      );

      if (uploaded) {
        setSuccessMessage('File uploaded successfully');
        resetForm();
        
        // Call the callback if it exists
        if (onDocumentUploadedCallback && typeof onDocumentUploadedCallback === 'function') {
          onDocumentUploadedCallback();
        }
        
        // Close dialog after successful upload
        setTimeout(() => {
          globalIsOpen = false;
          isWithinOfferDialog = false;
          setIsOpen(false);
          setIsWithinOffer(false);
        }, 1500);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  // Close handler
  const handleClose = () => {
    globalIsOpen = false;
    isWithinOfferDialog = false;
    onDocumentUploadedCallback = null;
    setIsOpen(false);
    setIsWithinOffer(false);
    resetForm();
  };

  // Don't render if not open
  if (!isOpen) return null;

  // Create the dialog content
  const dialogContent = (
    <div 
      className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-lg w-[600px] max-w-[95vw] shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Upload Document</h2>
          <button 
            onClick={handleClose} 
            className="text-[#cad2c5] hover:text-white p-2"
          >
            X
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            {successMessage}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            
            {/* Hidden file input */}
            <input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {/* Drag and drop area */}
            <div
              className={`border-2 border-dashed rounded-md p-6 transition-colors
                ${isDragging 
                  ? 'border-[#52796f] bg-[#354f52]/20' 
                  : 'border-[#52796f]/50 hover:border-[#52796f] hover:bg-[#354f52]/10'
                }
              `}
              onClick={() => document.getElementById('file')?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{ cursor: 'pointer' }}
            >
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <Upload className="h-8 w-8 text-[#52796f]" />
                
                {selectedFile ? (
                  <div>
                    <p className="font-medium">Selected file:</p>
                    <p className="text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-[#cad2c5]/70">{formatFileSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Drag a file here</p>
                    <p className="text-sm text-[#cad2c5]/70">or click to select</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              placeholder="e.g. Contract, Proposal, etc."
              className="bg-[#354f52] border-[#52796f]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="characteristic">Document Type</Label>
            <Select
              value={docCharacteristicId}
              onValueChange={setDocCharacteristicId}
            >
              <SelectTrigger className="bg-[#354f52] border-[#52796f]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-[#2f3e46] border-[#52796f]">
                <SelectItem key="none-char" value="none">None</SelectItem>
                {Array.isArray(characteristics) && characteristics.length > 0 ? (
                  characteristics.map((char) => (
                    <SelectItem key={`char-${char.id}`} value={char.id || 'invalid-id'}>
                      {char.emoji || ''} {char.name || 'Unknown'}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem key="loading-char" value="loading" disabled>Loading...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Document Status</Label>
            <Select
              value={docStatusId}
              onValueChange={setDocStatusId}
            >
              <SelectTrigger className="bg-[#354f52] border-[#52796f]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-[#2f3e46] border-[#52796f]">
                <SelectItem key="none-status" value="none">None</SelectItem>
                {Array.isArray(statuses) && statuses.length > 0 ? (
                  statuses.map((status) => (
                    <SelectItem key={`status-${status.id}`} value={status.id || 'invalid-id'}>
                      {status.emoji || ''} {status.name || 'Unknown'}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem key="loading-status" value="loading" disabled>Loading...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Enter document description..."
              className="bg-[#354f52] border-[#52796f]"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button 
            variant="outline" 
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button 
            disabled={!selectedFile || isUploading}
            onClick={handleUpload}
            className="bg-[#52796f] hover:bg-[#354f52]"
          >
            {isUploading ? (
              <>
                <Loader size={16} className="mr-2" />
                Uploading...
              </>
            ) : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  );

  // If within an offer dialog, render directly; otherwise use portal
  if (isWithinOffer) {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
        onClick={(e) => {
          // Only close if clicking the backdrop
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        {dialogContent}
      </div>
    );
  }

  // Use portal when not in offer dialog
  return portalContainer ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        // Only close if clicking the backdrop
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      {dialogContent}
    </div>,
    portalContainer
  ) : null;
});

DocumentUploadDialog.displayName = 'DocumentUploadDialog';

export default DocumentUploadDialog; 
