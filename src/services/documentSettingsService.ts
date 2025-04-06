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

// Define types for our tables
export interface DocuCharacteristic {
  id: string;
  name: string;
  emoji?: string;
  created_at: string;
  created_by?: string;
  modified_at?: string;
  modified_by?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface DocuStatus {
  id: string;
  name: string;
  emoji?: string;
  created_at: string;
  created_by?: string;
  modified_at?: string;
  modified_by?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface SystemSetting {
  id: string;
  document_path: string;
  created_at: string;
  created_by?: string;
  modified_at?: string;
  modified_by?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

/**
 * Get the current user ID from session storage
 */
const getCurrentUserId = (): string | null => {
  try {
    const userId = sessionStorage.getItem('userId');
    
    // Validate if the userID is a valid UUID
    if (!userId) return null;
    
    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    return uuidRegex.test(userId) ? userId : null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

// ===== Document Characteristics Functions =====

/**
 * Get all document characteristics
 */
export const getAllDocuCharacteristics = async (): Promise<DocuCharacteristic[]> => {
  try {
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('docu_characteristics')
      .select('*')
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching document characteristics:', error);
    return [];
  }
};

/**
 * Get a single document characteristic by ID
 */
export const getDocuCharacteristicById = async (id: string): Promise<DocuCharacteristic | null> => {
  try {
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('docu_characteristics')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching document characteristic with ID ${id}:`, error);
    return null;
  }
};

/**
 * Create a new document characteristic
 */
export const createDocuCharacteristic = async (characteristicData: { 
  name: string;
  emoji?: string;
}): Promise<DocuCharacteristic | null> => {
  try {
    const userId = getCurrentUserId();
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('docu_characteristics')
      .insert({
        ...characteristicData,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating document characteristic:', error);
    return null;
  }
};

/**
 * Update a document characteristic
 */
export const updateDocuCharacteristic = async (
  id: string,
  updates: {
    name?: string;
    emoji?: string;
  }
): Promise<DocuCharacteristic | null> => {
  try {
    const userId = getCurrentUserId();
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('docu_characteristics')
      .update({
        ...updates,
        modified_at: new Date().toISOString(),
        modified_by: userId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating document characteristic with ID ${id}:`, error);
    return null;
  }
};

/**
 * Soft delete a document characteristic
 */
export const deleteDocuCharacteristic = async (id: string): Promise<boolean> => {
  try {
    const userId = getCurrentUserId();
    // Use type assertion to bypass type checking for now
    const { error } = await (supabase as any)
      .from('docu_characteristics')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting document characteristic with ID ${id}:`, error);
    return false;
  }
};

// ===== Document Status Functions =====

/**
 * Get all document statuses
 */
export const getAllDocuStatuses = async (): Promise<DocuStatus[]> => {
  try {
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('docu_status')
      .select('*')
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching document statuses:', error);
    return [];
  }
};

/**
 * Get a single document status by ID
 */
export const getDocuStatusById = async (id: string): Promise<DocuStatus | null> => {
  try {
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('docu_status')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching document status with ID ${id}:`, error);
    return null;
  }
};

/**
 * Create a new document status
 */
export const createDocuStatus = async (statusData: { 
  name: string;
  emoji?: string;
}): Promise<DocuStatus | null> => {
  try {
    const userId = getCurrentUserId();
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('docu_status')
      .insert({
        ...statusData,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating document status:', error);
    return null;
  }
};

/**
 * Update a document status
 */
export const updateDocuStatus = async (
  id: string,
  updates: {
    name?: string;
    emoji?: string;
  }
): Promise<DocuStatus | null> => {
  try {
    const userId = getCurrentUserId();
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('docu_status')
      .update({
        ...updates,
        modified_at: new Date().toISOString(),
        modified_by: userId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating document status with ID ${id}:`, error);
    return null;
  }
};

/**
 * Soft delete a document status
 */
export const deleteDocuStatus = async (id: string): Promise<boolean> => {
  try {
    const userId = getCurrentUserId();
    // Use type assertion to bypass type checking for now
    const { error } = await (supabase as any)
      .from('docu_status')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting document status with ID ${id}:`, error);
    return false;
  }
};

// ===== System Settings Functions =====

/**
 * Get the document path from system settings
 */
export const getDocumentPath = async (): Promise<string> => {
  try {
    // Use type assertion to bypass type checking for now
    const { data, error } = await (supabase as any)
      .from('system_settings')
      .select('document_path')
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    
    return data?.document_path || '';
  } catch (error) {
    console.error('Error fetching document path:', error);
    return '';
  }
};

/**
 * Update the document path in system settings
 */
export const updateDocumentPath = async (docPath: string): Promise<void> => {
  try {
    // Get the existing settings record
    const { data: existingSettings } = await (supabase as any)
      .from('system_settings')
      .select('id')
      .eq('is_deleted', false);

    // Only update the document_path field, no user IDs or timestamps
    if (existingSettings && existingSettings.length > 0) {
      const { error } = await (supabase as any)
        .from('system_settings')
        .update({ document_path: docPath })
        .eq('id', existingSettings[0].id);
      
      if (error) throw error;
    } else {
      // Insert a new record with just the document path
      const { error } = await (supabase as any)
        .from('system_settings')
        .insert({ document_path: docPath });
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error updating document path:', error);
    throw error;
  }
};

/**
 * Create offer directory if it doesn't exist
 */
export const createOfferDirectory = async (offerId: string, customerName: string): Promise<string> => {
  try {
    const basePath = await getDocumentPath();
    if (!basePath) {
      throw new Error('Document base path not configured');
    }

    // Sanitize customer name for folder name
    const sanitizedName = customerName.replace(/[/\\?%*:|"<>]/g, '_');
    const offerDir = path.join(basePath, sanitizedName, offerId);

    // Node.js specific operations
    if (isNode && fs) {
      // Check if directory exists, create if not
      if (!fs.existsSync(offerDir)) {
        fs.mkdirSync(offerDir, { recursive: true });
      }
    } else {
      console.log('Directory creation skipped in browser environment');
    }

    return offerDir;
  } catch (error) {
    console.error('Error creating offer directory:', error);
    throw error;
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
      console.log('Path validation skipped in browser environment');
      // In browser context, we'll just assume the path is valid
      return { valid: true, message: 'Path validation skipped in browser environment' };
    }
  } catch (error) {
    return { 
      valid: false, 
      message: `Path exists but is not writable: ${(error as Error).message}` 
    };
  }
}; 