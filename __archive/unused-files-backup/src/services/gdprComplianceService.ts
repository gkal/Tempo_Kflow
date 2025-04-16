import { supabaseClient } from '@/lib/supabase';
import { createRecord, updateRecord, fetchRecords, softDeleteRecord } from '@/lib/supabaseService';
import { UserData } from '@/types/auth';

// Types
export interface DataProcessingAgreement {
  id: string;
  title: string;
  version: string;
  content: string;
  effective_date: string;
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  customer_id?: string;
  agreement_id: string;
  consent_type: 'marketing' | 'analytics' | 'necessary' | 'third_party' | 'data_processing';
  status: 'granted' | 'denied' | 'withdrawn' | 'expired';
  ip_address?: string;
  consent_date: string;
  withdrawal_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface DataSubjectRequest {
  id: string;
  request_type: 'access' | 'deletion' | 'rectification' | 'portability' | 'restriction' | 'objection';
  user_id?: string;
  customer_id?: string;
  email: string;
  status: 'pending' | 'processing' | 'completed' | 'denied';
  request_data: any;
  response_data?: any;
  completed_date?: string;
  verification_token: string;
  is_verified: boolean;
  verification_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface DataExportPackage {
  id: string;
  user_id?: string;
  customer_id?: string;
  request_id: string;
  export_data: any;
  export_format: 'json' | 'csv' | 'pdf';
  download_token: string;
  is_downloaded: boolean;
  download_date?: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface DataBreachRecord {
  id: string;
  breach_date: string;
  detection_date: string;
  description: string;
  affected_data: string[];
  affected_users_count: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  notification_status: 'pending' | 'notified' | 'not_required';
  notification_date?: string;
  remediation_steps: string;
  report_submitted: boolean;
  report_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// GDPR Compliance Service
class GDPRComplianceService {
  private static instance: GDPRComplianceService;
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  public static getInstance(): GDPRComplianceService {
    if (!GDPRComplianceService.instance) {
      GDPRComplianceService.instance = new GDPRComplianceService();
    }
    return GDPRComplianceService.instance;
  }
  
  // Data Processing Agreement Methods
  
  /**
   * Get the latest active data processing agreement
   */
  public async getActiveDataProcessingAgreement(): Promise<DataProcessingAgreement | null> {
    try {
      const { data, error } = await supabaseClient
        .from('data_processing_agreements')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as DataProcessingAgreement;
    } catch (error) {
      console.error('Error fetching active data processing agreement:', error);
      return null;
    }
  }
  
  /**
   * Create a new data processing agreement
   */
  public async createDataProcessingAgreement(agreementData: Omit<DataProcessingAgreement, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<DataProcessingAgreement | null> {
    try {
      // If setting as active, deactivate all other agreements
      if (agreementData.is_active) {
        await this.deactivateAllAgreements();
      }
      
      const newAgreement = await createRecord<any>('data_processing_agreements', {
        ...agreementData,
        is_deleted: false
      });
      
      return newAgreement as DataProcessingAgreement;
    } catch (error) {
      console.error('Error creating data processing agreement:', error);
      return null;
    }
  }
  
  /**
   * Deactivate all data processing agreements
   */
  private async deactivateAllAgreements(): Promise<void> {
    try {
      const { data, error } = await supabaseClient
        .from('data_processing_agreements')
        .update({ is_active: false })
        .eq('is_active', true)
        .eq('is_deleted', false);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating agreements:', error);
    }
  }
  
  /**
   * Get all data processing agreements
   */
  public async getAllDataProcessingAgreements(): Promise<DataProcessingAgreement[]> {
    try {
      const { data, error } = await supabaseClient
        .from('data_processing_agreements')
        .select('*')
        .eq('is_deleted', false)
        .order('effective_date', { ascending: false });
      
      if (error) throw error;
      return data as DataProcessingAgreement[];
    } catch (error) {
      console.error('Error fetching data processing agreements:', error);
      return [];
    }
  }
  
  // Consent Management Methods
  
  /**
   * Record a user's consent
   */
  public async recordConsent(
    consentData: Omit<ConsentRecord, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>
  ): Promise<ConsentRecord | null> {
    try {
      const newConsent = await createRecord<any>('consent_records', {
        ...consentData,
        is_deleted: false
      });
      
      return newConsent as ConsentRecord;
    } catch (error) {
      console.error('Error recording consent:', error);
      return null;
    }
  }
  
  /**
   * Update a user's consent status
   */
  public async updateConsentStatus(
    consentId: string,
    status: ConsentRecord['status'],
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: Partial<ConsentRecord> = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === 'withdrawn') {
        updateData.withdrawal_date = new Date().toISOString();
      }
      
      if (notes) {
        updateData.notes = notes;
      }
      
      await updateRecord('consent_records', consentId, updateData);
      return true;
    } catch (error) {
      console.error('Error updating consent status:', error);
      return false;
    }
  }
  
  /**
   * Get all consent records for a user
   */
  public async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const { data, error } = await supabaseClient
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('consent_date', { ascending: false });
      
      if (error) throw error;
      return data as ConsentRecord[];
    } catch (error) {
      console.error('Error fetching user consents:', error);
      return [];
    }
  }
  
  /**
   * Get all consent records for a customer
   */
  public async getCustomerConsents(customerId: string): Promise<ConsentRecord[]> {
    try {
      const { data, error } = await supabaseClient
        .from('consent_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_deleted', false)
        .order('consent_date', { ascending: false });
      
      if (error) throw error;
      return data as ConsentRecord[];
    } catch (error) {
      console.error('Error fetching customer consents:', error);
      return [];
    }
  }
  
  /**
   * Check if user has consented to a specific type
   */
  public async hasUserConsented(
    userId: string, 
    consentType: ConsentRecord['consent_type']
  ): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .eq('status', 'granted')
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking user consent:', error);
      return false;
    }
  }
  
  // Right to be Forgotten Methods
  
  /**
   * Submit a data subject request (e.g., deletion, access, etc.)
   */
  public async submitDataSubjectRequest(
    requestData: Omit<DataSubjectRequest, 'id' | 'status' | 'created_at' | 'updated_at' | 'is_deleted'>
  ): Promise<DataSubjectRequest | null> {
    try {
      const newRequest = await createRecord<any>('data_subject_requests', {
        ...requestData,
        status: 'pending',
        is_deleted: false
      });
      
      return newRequest as DataSubjectRequest;
    } catch (error) {
      console.error('Error submitting data subject request:', error);
      return null;
    }
  }
  
  /**
   * Update the status of a data subject request
   */
  public async updateRequestStatus(
    requestId: string,
    status: DataSubjectRequest['status'],
    notes?: string,
    responseData?: any
  ): Promise<boolean> {
    try {
      const updateData: Partial<DataSubjectRequest> = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }
      
      if (notes) {
        updateData.notes = notes;
      }
      
      if (responseData) {
        updateData.response_data = responseData;
      }
      
      await updateRecord('data_subject_requests', requestId, updateData);
      return true;
    } catch (error) {
      console.error('Error updating request status:', error);
      return false;
    }
  }
  
  /**
   * Process a right to be forgotten request
   */
  public async processRightToBeForgotten(requestId: string, email: string): Promise<boolean> {
    try {
      // Mark request as processing
      await this.updateRequestStatus(requestId, 'processing');
      
      // Find the user by email
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('is_deleted', false)
        .maybeSingle();
      
      if (userError) throw userError;
      
      if (userData) {
        const userId = userData.id;
        
        // 1. Anonymize user data
        await this.anonymizeUserData(userId);
        
        // 2. Delete customer records if any
        await this.deleteCustomerRecords(email);
        
        // 3. Delete form submissions
        await this.deleteFormSubmissions(userId);
        
        // 4. Delete consent records
        await this.deleteConsentRecords(userId);
        
        // 5. Delete auth data (should be the last step)
        await this.deleteAuthData(userId);
      }
      
      // Mark the request as completed
      await this.updateRequestStatus(
        requestId, 
        'completed', 
        'Right to be forgotten request processed successfully'
      );
      
      return true;
    } catch (error) {
      console.error('Error processing right to be forgotten:', error);
      
      // Mark the request as failed
      await this.updateRequestStatus(
        requestId, 
        'pending', 
        `Error processing request: ${(error as Error).message}`
      );
      
      return false;
    }
  }
  
  /**
   * Anonymize user data
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    try {
      // Example: anonymize user profiles, replacing personal data with placeholders
      await updateRecord('user_profiles', userId, {
        first_name: '[REDACTED]',
        last_name: '[REDACTED]',
        address: '[REDACTED]',
        phone_number: '[REDACTED]',
        is_anonymized: true
      });
    } catch (error) {
      console.error('Error anonymizing user data:', error);
      throw error;
    }
  }
  
  /**
   * Delete customer records
   */
  private async deleteCustomerRecords(email: string): Promise<void> {
    try {
      // Find customers with matching email
      const { data: customers, error: customersError } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('email', email)
        .eq('is_deleted', false);
      
      if (customersError) throw customersError;
      
      // Soft delete each customer record
      for (const customer of customers) {
        await softDeleteRecord('customers', customer.id);
      }
    } catch (error) {
      console.error('Error deleting customer records:', error);
      throw error;
    }
  }
  
  /**
   * Delete form submissions
   */
  private async deleteFormSubmissions(userId: string): Promise<void> {
    try {
      // Find form submissions by user
      const { data: submissions, error: submissionsError } = await supabaseClient
        .from('customer_form_links')
        .select('id')
        .eq('created_by', userId)
        .eq('is_deleted', false);
      
      if (submissionsError) throw submissionsError;
      
      // Soft delete each submission
      for (const submission of submissions) {
        await softDeleteRecord('customer_form_links', submission.id);
      }
    } catch (error) {
      console.error('Error deleting form submissions:', error);
      throw error;
    }
  }
  
  /**
   * Delete consent records
   */
  private async deleteConsentRecords(userId: string): Promise<void> {
    try {
      // Find consent records by user
      const { data: consents, error: consentsError } = await supabaseClient
        .from('consent_records')
        .select('id')
        .eq('user_id', userId)
        .eq('is_deleted', false);
      
      if (consentsError) throw consentsError;
      
      // Soft delete each consent record
      for (const consent of consents) {
        await softDeleteRecord('consent_records', consent.id);
      }
    } catch (error) {
      console.error('Error deleting consent records:', error);
      throw error;
    }
  }
  
  /**
   * Delete auth data
   */
  private async deleteAuthData(userId: string): Promise<void> {
    try {
      // This is a protected API that requires admin privileges
      // We're using supabaseClient.auth for direct auth operations
      const { error } = await supabaseClient.auth.admin.deleteUser(userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting auth data:', error);
      throw error;
    }
  }
  
  // Data Portability Methods
  
  /**
   * Create data export package for a user
   */
  public async createDataExport(userId: string, requestId: string): Promise<DataExportPackage | null> {
    try {
      // 1. Collect all user data
      const userData = await this.collectUserData(userId);
      
      // 2. Create a secure download token
      const downloadToken = this.generateDownloadToken();
      
      // 3. Calculate expiry date (7 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      
      // 4. Create the export record
      const exportPackage = await createRecord<any>('data_export_packages', {
        user_id: userId,
        request_id: requestId,
        export_data: userData,
        export_format: 'json',
        download_token: downloadToken,
        is_downloaded: false,
        expiry_date: expiryDate.toISOString(),
        is_deleted: false
      });
      
      // 5. Update the request status
      await this.updateRequestStatus(
        requestId, 
        'completed', 
        'Data export package created successfully', 
        { export_id: exportPackage.id }
      );
      
      return exportPackage as DataExportPackage;
    } catch (error) {
      console.error('Error creating data export:', error);
      return null;
    }
  }
  
  /**
   * Collect all data for a user
   */
  private async collectUserData(userId: string): Promise<any> {
    try {
      // Collect user profile
      const { data: profile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      
      // Collect all consent records
      const { data: consents, error: consentsError } = await supabaseClient
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false);
      
      if (consentsError) throw consentsError;
      
      // Collect form submissions
      const { data: formSubmissions, error: formError } = await supabaseClient
        .from('customer_form_links')
        .select('*')
        .eq('created_by', userId)
        .eq('is_deleted', false);
      
      if (formError) throw formError;
      
      // Return the collected data
      return {
        profile,
        consents,
        form_submissions: formSubmissions,
        export_date: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error collecting user data:', error);
      throw error;
    }
  }
  
  /**
   * Generate a secure download token
   */
  private generateDownloadToken(): string {
    // Generate a random token
    return `export_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Mark a data export as downloaded
   */
  public async markExportAsDownloaded(exportId: string): Promise<boolean> {
    try {
      await updateRecord('data_export_packages', exportId, {
        is_downloaded: true,
        download_date: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error marking export as downloaded:', error);
      return false;
    }
  }
  
  /**
   * Validate a download token and get the export package
   */
  public async validateExportToken(token: string): Promise<DataExportPackage | null> {
    try {
      const { data, error } = await supabaseClient
        .from('data_export_packages')
        .select('*')
        .eq('download_token', token)
        .eq('is_deleted', false)
        .single();
      
      if (error) throw error;
      
      const exportPackage = data as DataExportPackage;
      
      // Check if the export has expired
      if (new Date(exportPackage.expiry_date) < new Date()) {
        return null;
      }
      
      return exportPackage;
    } catch (error) {
      console.error('Error validating export token:', error);
      return null;
    }
  }
  
  // Data Breach Notification Methods
  
  /**
   * Record a data breach incident
   */
  public async recordDataBreach(
    breachData: Omit<DataBreachRecord, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>
  ): Promise<DataBreachRecord | null> {
    try {
      const newBreach = await createRecord<any>('data_breach_records', {
        ...breachData,
        is_deleted: false
      });
      
      return newBreach as DataBreachRecord;
    } catch (error) {
      console.error('Error recording data breach:', error);
      return null;
    }
  }
  
  /**
   * Update a data breach record
   */
  public async updateDataBreach(
    breachId: string,
    updateData: Partial<DataBreachRecord>
  ): Promise<boolean> {
    try {
      await updateRecord('data_breach_records', breachId, updateData);
      return true;
    } catch (error) {
      console.error('Error updating data breach record:', error);
      return false;
    }
  }
  
  /**
   * Get all data breach records
   */
  public async getAllDataBreaches(): Promise<DataBreachRecord[]> {
    try {
      const { data, error } = await supabaseClient
        .from('data_breach_records')
        .select('*')
        .eq('is_deleted', false)
        .order('detection_date', { ascending: false });
      
      if (error) throw error;
      return data as DataBreachRecord[];
    } catch (error) {
      console.error('Error fetching data breach records:', error);
      return [];
    }
  }
}

// Export singleton instance
export const gdprComplianceService = GDPRComplianceService.getInstance();
export default gdprComplianceService; 