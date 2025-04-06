import { supabase } from '@/lib/supabaseClient';
import { createOfferDirectory, getDocumentPath } from './documentSettingsService';

// Conditional imports for Node.js modules
let fs: any = null;
let path: any = null;

// Check if we're in a Node.js environment (not browser)
const isNode = typeof process !== 'undefined' && 
  process.versions != null && 
  process.versions.node != null;

// Only import Node.js modules if we're in a Node.js environment
if (isNode) {
  fs = require('fs');
  path = require('path');
} else {
  // Browser alternative for path functions
  path = {
    join: (...paths: string[]): string => {
      return paths.join('/').replace(/\/+/g, '/');
    },
    basename: (filePath: string, ext?: string): string => {
      const name = filePath.split('/').pop() || filePath;
      return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
    },
    extname: (filePath: string): string => {
      const parts = filePath.split('.');
      return parts.length > 1 ? `.${parts.pop()}` : '';
    }
  };
}

/**
 * Interface for Offer Document
 */
export interface OfferDocument {
  id: string;
  offer_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  document_category?: string;
  description?: string;
  fs_created_at?: string;
  fs_modified_at?: string;
  not_found: boolean;
  created_at: string;
  created_by?: string;
  modified_at?: string;
  modified_by?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  docu_characteristic_id?: string;
  docu_status_id?: string;
}

/**
 * Get the current user ID from session storage
 */
const getCurrentUserId = (): string | null => {
  try {
    return sessionStorage.getItem('userId');
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

/**
 * Get file metadata from the file system
 */
const getFileMetadata = (filePath: string, fileSize: number = 0): { 
  createdAt: string; 
  modifiedAt: string;
  size: number;
} => {
  try {
    if (isNode && fs) {
      const stats = fs.statSync(filePath);
      return {
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        size: stats.size
      };
    } else {
      // In browser environment, return current time and passed size
      return {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        size: fileSize
      };
    }
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      size: fileSize
    };
  }
};

/**
 * Get the MIME type based on file extension
 */
const getMimeType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip'
  };

  const ext = extension.toLowerCase().replace('.', '');
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Get all documents for an offer
 */
export const getOfferDocuments = async (offerId: string): Promise<OfferDocument[]> => {
  try {
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('offer_documents')
      .select(`
        *,
        docu_characteristics:docu_characteristic_id(id, name, emoji),
        docu_status:docu_status_id(id, name, emoji)
      `)
      .eq('offer_id', offerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching documents for offer ${offerId}:`, error);
    return [];
  }
};

/**
 * Get a single document by ID
 */
export const getDocumentById = async (documentId: string): Promise<OfferDocument | null> => {
  try {
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('offer_documents')
      .select(`
        *,
        docu_characteristics:docu_characteristic_id(id, name, emoji),
        docu_status:docu_status_id(id, name, emoji)
      `)
      .eq('id', documentId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching document with ID ${documentId}:`, error);
    return null;
  }
};

/**
 * Upload a new document for an offer
 */
export const uploadOfferDocument = async (
  offerId: string,
  customerName: string,
  file: File,
  options: {
    category?: string;
    description?: string;
    docu_characteristic_id?: string;
    docu_status_id?: string;
  } = {}
): Promise<OfferDocument | null> => {
  try {
    // Create offer directory if it doesn't exist
    const offerDir = await createOfferDirectory(offerId, customerName);
    
    // Generate a unique filename to avoid conflicts
    const timestamp = new Date().getTime();
    const fileExt = path.extname(file.name);
    const baseName = path.basename(file.name, fileExt);
    const uniqueFileName = `${baseName}_${timestamp}${fileExt}`;
    const filePath = path.join(offerDir, uniqueFileName);
    
    // Write file to disk - only in Node environment
    if (isNode && fs) {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);
    } else {
      console.log('File writing skipped in browser environment');
    }
    
    // Get file metadata
    const metadata = getFileMetadata(filePath, file.size);
    
    // Create document record in database
    const userId = getCurrentUserId();
    const documentData = {
      offer_id: offerId,
      file_path: filePath,
      file_name: uniqueFileName,
      file_size: metadata.size,
      document_category: options.category,
      description: options.description,
      fs_created_at: metadata.createdAt,
      fs_modified_at: metadata.modifiedAt,
      not_found: false,
      created_by: userId,
      docu_characteristic_id: options.docu_characteristic_id,
      docu_status_id: options.docu_status_id
    };
    
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('offer_documents')
      .insert(documentData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading document:', error);
    return null;
  }
};

/**
 * Update document metadata
 */
export const updateDocument = async (
  documentId: string,
  updates: {
    document_category?: string;
    description?: string;
    docu_characteristic_id?: string;
    docu_status_id?: string;
    not_found?: boolean;
  }
): Promise<OfferDocument | null> => {
  try {
    const userId = getCurrentUserId();
    
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('offer_documents')
      .update({
        ...updates,
        modified_at: new Date().toISOString(),
        modified_by: userId
      })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating document with ID ${documentId}:`, error);
    return null;
  }
};

/**
 * Soft delete a document
 */
export const deleteDocument = async (documentId: string): Promise<boolean> => {
  try {
    // First, get the document to check its file path
    const document = await getDocumentById(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }
    
    // Delete the file from disk if it exists
    if (fs.existsSync(document.file_path)) {
      try {
        fs.unlinkSync(document.file_path);
      } catch (fileError) {
        console.error(`Error deleting file ${document.file_path}:`, fileError);
        // Continue with database soft delete even if file delete fails
      }
    }
    
    // Soft delete in the database
    const userId = getCurrentUserId();
    const { error } = await (supabase as any)
      .from('offer_documents')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('id', documentId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting document with ID ${documentId}:`, error);
    return false;
  }
};

/**
 * Open a document
 */
export const openDocument = async (documentId: string): Promise<boolean> => {
  try {
    // Get document details
    const document = await getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Update access timestamp
    const userId = getCurrentUserId();
    await (supabase as any)
      .from('offer_documents')
      .update({
        modified_at: new Date().toISOString(),
        modified_by: userId
      })
      .eq('id', documentId);

    // Open the file
    if (isNode) {
      // In desktop app, we'd check if file exists
      if (fs && !fs.existsSync(document.file_path)) {
        await (supabase as any)
          .from('offer_documents')
          .update({ not_found: true })
          .eq('id', documentId);
        
        throw new Error('File not found on disk');
      }
      
      // Open with system's default application (implementation would depend on framework)
      console.log(`Opening file (Node environment): ${document.file_path}`);
    } else {
      // In browser, try to open via URL
      console.log(`Opening file (browser environment): ${document.file_path}`);
      window.open(`file://${document.file_path}`, '_blank');
    }

    return true;
  } catch (error) {
    console.error('Error opening document:', error);
    return false;
  }
};

/**
 * Synchronize the database with the actual files on disk
 */
export const syncFilesWithDatabase = async (): Promise<{ 
  added: number; 
  removed: number; 
  errors: string[] 
}> => {
  const result = { added: 0, removed: 0, errors: [] };
  
  try {
    // Get the base path where documents are stored
    const basePath = await getDocumentPath();
    if (!basePath) {
      throw new Error('Document path not configured');
    }
    
    // Get all documents from the database
    const { data: dbDocuments, error } = await (supabase as any)
      .from('offer_documents')
      .select('id, file_path, not_found')
      .eq('is_deleted', false);
    
    if (error) throw error;
    
    // Check if files exist and update not_found flag
    for (const doc of dbDocuments) {
      const exists = fs.existsSync(doc.file_path);
      
      if (!exists && !doc.not_found) {
        // Update the not_found flag
        await updateDocument(doc.id, { not_found: true });
        result.removed++;
      } else if (exists && doc.not_found) {
        // File was found but was marked as not_found
        await updateDocument(doc.id, { not_found: false });
      }
    }
    
    // TODO: Scan directories for new files and add them to the database
    // This would require knowledge of the directory structure and the offer they belong to
    
    return result;
  } catch (error) {
    console.error('Error syncing files with database:', error);
    result.errors.push(`${error}`);
    return result;
  }
};

/**
 * Get document statistics for an offer
 */
export const getDocumentStats = async (offerId: string): Promise<{
  count: number;
  totalSize: number;
  byCategory: Record<string, number>;
  byCharacteristic: Record<string, number>;
  byStatus: Record<string, number>;
}> => {
  try {
    // Get all documents for the offer
    const documents = await getOfferDocuments(offerId);
    
    // Calculate statistics
    const stats = {
      count: documents.length,
      totalSize: 0,
      byCategory: {} as Record<string, number>,
      byCharacteristic: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };
    
    documents.forEach(doc => {
      // Total size
      stats.totalSize += doc.file_size || 0;
      
      // By category
      const category = doc.document_category || 'Uncategorized';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
      // By characteristic
      if (doc.docu_characteristic_id) {
        const characteristic = (doc as any).docu_characteristics?.name || 'Unknown';
        stats.byCharacteristic[characteristic] = (stats.byCharacteristic[characteristic] || 0) + 1;
      }
      
      // By status
      if (doc.docu_status_id) {
        const status = (doc as any).docu_status?.name || 'Unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      }
    });
    
    return stats;
  } catch (error) {
    console.error(`Error getting document stats for offer ${offerId}:`, error);
    return {
      count: 0,
      totalSize: 0,
      byCategory: {},
      byCharacteristic: {},
      byStatus: {}
    };
  }
}; 