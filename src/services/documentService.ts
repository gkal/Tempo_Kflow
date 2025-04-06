import { supabase } from '@/lib/supabaseClient';

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
  // Browser alternative for path.join
  path = {
    join: (...paths: string[]): string => {
      return paths.join('/').replace(/\/+/g, '/');
    },
    basename: (filePath: string): string => {
      return filePath.split('/').pop() || filePath;
    }
  };
}

// Define table name constants to avoid string literal errors
const SYSTEM_SETTINGS_TABLE = 'system_settings';
const DOCUMENT_REFERENCES_TABLE = 'document_references';

// Define document reference interface
export interface DocumentReference {
  id: string;
  customer_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  thumbnail: string | null;
  is_deleted: boolean;
  created_by?: string;
  modified_by?: string;
  modified_at?: string;
  last_accessed?: string;
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
 * Get the base document path from system settings
 */
export const getDocumentBasePath = async (): Promise<string> => {
  try {
    // Use any type to avoid TypeScript errors with custom tables
    const { data, error } = await (supabase as any)
      .from(SYSTEM_SETTINGS_TABLE)
      .select('setting_value')
      .eq('setting_key', 'document_base_path')
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    
    return data?.setting_value || '';
  } catch (error) {
    console.error('Error fetching document base path:', error);
    return '';
  }
};

/**
 * Update the document base path in system settings
 */
export const updateDocumentBasePath = async (basePath: string): Promise<void> => {
  try {
    const { data: existingSettings } = await (supabase as any)
      .from(SYSTEM_SETTINGS_TABLE)
      .select('id')
      .eq('setting_key', 'document_base_path')
      .eq('is_deleted', false)
      .single();

    const userId = getCurrentUserId();

    if (existingSettings?.id) {
      await (supabase as any)
        .from(SYSTEM_SETTINGS_TABLE)
        .update({
          setting_value: basePath,
          modified_at: new Date().toISOString(),
          modified_by: userId
        })
        .eq('id', existingSettings.id);
    } else {
      await (supabase as any)
        .from(SYSTEM_SETTINGS_TABLE)
        .insert({
          setting_key: 'document_base_path',
          setting_value: basePath,
          description: 'Base path for storing customer documents on the local file system',
          created_by: userId
        });
    }
  } catch (error) {
    console.error('Error updating document base path:', error);
    throw error;
  }
};

/**
 * Create customer directory if it doesn't exist
 */
export const createCustomerDirectory = async (customerId: string, customerName: string): Promise<string> => {
  try {
    const basePath = await getDocumentBasePath();
    if (!basePath) {
      throw new Error('Document base path not configured');
    }

    // Sanitize customer name for folder name
    const sanitizedName = customerName.replace(/[/\\?%*:|"<>]/g, '_');
    const customerDir = path.join(basePath, sanitizedName);

    // Check if directory exists, create if not - only in Node environment
    if (isNode && fs) {
      if (!fs.existsSync(customerDir)) {
        fs.mkdirSync(customerDir, { recursive: true });
      }
    } else {
      console.log('Directory creation skipped in browser environment');
    }

    return customerDir;
  } catch (error) {
    console.error('Error creating customer directory:', error);
    throw error;
  }
};

/**
 * Save a file to the customer directory
 */
export const saveFile = async (
  customerId: string, 
  customerName: string, 
  file: File, 
  description?: string
): Promise<DocumentReference> => {
  try {
    const customerDir = await createCustomerDirectory(customerId, customerName);
    const fileName = path.basename(file.name);
    const filePath = path.join(customerDir, fileName);
    
    // Write file to disk - only in Node environment
    if (isNode && fs) {
      // Convert File to ArrayBuffer, then to Buffer for writing to disk
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);
    } else {
      console.log('File saving skipped in browser environment');
    }

    // Generate thumbnail (basic implementation - can be enhanced for different file types)
    let thumbnail = null;
    if (file.type.startsWith('image/')) {
      // For images, we could create a small base64 thumbnail
      // This is a placeholder for actual thumbnail generation
      thumbnail = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    }

    // In browser, get relative path through string manipulation
    const relativeFilePath = isNode && fs 
      ? filePath.replace(await getDocumentBasePath(), '').replace(/^[\\\/]/, '')
      : `${sanitizeFileName(customerName)}/${fileName}`;

    // Create document reference in database
    const userId = getCurrentUserId();

    const { data, error } = await (supabase as any).from(DOCUMENT_REFERENCES_TABLE).insert({
      customer_id: customerId,
      file_path: relativeFilePath,
      file_name: fileName,
      file_type: file.type,
      file_size: file.size,
      description: description || '',
      thumbnail,
      created_by: userId
    }).select('*').single();

    if (error) throw error;
    return data as DocumentReference;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

/**
 * Helper function to sanitize file names for browser environment
 */
const sanitizeFileName = (name: string): string => {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
};

/**
 * Get all document references for a customer
 */
export const getCustomerDocuments = async (customerId: string): Promise<DocumentReference[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from(DOCUMENT_REFERENCES_TABLE)
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as DocumentReference[] || [];
  } catch (error) {
    console.error('Error fetching customer documents:', error);
    return [];
  }
};

/**
 * Open a document with the system's default application
 */
export const openDocument = async (documentId: string): Promise<void> => {
  try {
    const { data: document, error } = await (supabase as any)
      .from(DOCUMENT_REFERENCES_TABLE)
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      throw new Error('Document not found');
    }

    const basePath = await getDocumentBasePath();
    const fullPath = path.join(basePath, document.file_path);

    // Update last accessed timestamp
    await (supabase as any).from(DOCUMENT_REFERENCES_TABLE).update({
      last_accessed: new Date().toISOString()
    }).eq('id', documentId);

    // Open file - behavior differs between Node and browser environments
    if (isNode) {
      // For desktop/Electron, we might use shell.openPath or similar
      console.log(`Opening file (Node environment): ${fullPath}`);
      // Implementation would depend on the desktop framework
    } else {
      // For web, either download the file or open it in a new tab
      console.log(`Opening file (browser environment): ${fullPath}`);
      window.open(`file://${fullPath}`, '_blank');
    }
  } catch (error) {
    console.error('Error opening document:', error);
    throw error;
  }
};

/**
 * Delete a document (soft delete in database, but keep the file)
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    const { error } = await (supabase as any)
      .from(DOCUMENT_REFERENCES_TABLE)
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: getCurrentUserId()
      })
      .eq('id', documentId);
      
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Get document details by ID
 */
export const getDocumentById = async (documentId: string): Promise<DocumentReference | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from(DOCUMENT_REFERENCES_TABLE)
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return data as DocumentReference;
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
};

/**
 * Update document metadata
 */
export const updateDocumentMetadata = async (
  documentId: string, 
  updates: Partial<DocumentReference>
): Promise<DocumentReference | null> => {
  try {
    const userId = getCurrentUserId();

    const { data, error } = await (supabase as any)
      .from(DOCUMENT_REFERENCES_TABLE)
      .update({
        ...updates,
        modified_at: new Date().toISOString(),
        modified_by: userId
      })
      .eq('id', documentId)
      .select('*')
      .single();

    if (error) throw error;
    return data as DocumentReference;
  } catch (error) {
    console.error('Error updating document metadata:', error);
    return null;
  }
};

/**
 * List files in a directory
 */
export const listFilesInDirectory = (directoryPath: string): string[] => {
  try {
    if (isNode && fs) {
      if (!fs.existsSync(directoryPath)) {
        return [];
      }
      return fs.readdirSync(directoryPath)
        .filter((file: string) => !fs.statSync(path.join(directoryPath, file)).isDirectory());
    } else {
      console.log('listFilesInDirectory not available in browser environment');
      return [];
    }
  } catch (error) {
    console.error('Error listing files in directory:', error);
    return [];
  }
};

/**
 * Check if a path exists and is accessible
 */
export const validatePath = (pathToCheck: string): { valid: boolean; message: string } => {
  try {
    if (isNode && fs) {
      if (!fs.existsSync(pathToCheck)) {
        return { valid: false, message: 'Path does not exist' };
      }

      // Try writing a test file to check permissions
      const testFile = path.join(pathToCheck, '.test_write_permission');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      return { valid: true, message: 'Path is valid and writable' };
    } else {
      console.log('validatePath not available in browser environment');
      // In browser, just return as valid (or implement an alternative check)
      return { valid: true, message: 'Path validation skipped in browser environment' };
    }
  } catch (error) {
    return { 
      valid: false, 
      message: `Path exists but is not writable: ${(error as Error).message}` 
    };
  }
}; 