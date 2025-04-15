import { supabase } from '@/lib/supabaseClient';
import formTrackingService from './formTrackingService';

/**
 * Severity levels for form errors
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error type categorization
 */
export enum ErrorType {
  VALIDATION = 'validation',
  SUBMISSION = 'submission',
  API = 'api',
  CONNECTIVITY = 'connectivity',
  UNKNOWN = 'unknown'
}

/**
 * Interface for error tracking data
 */
interface ErrorTrackingData {
  formLinkId: string;
  sessionId?: string;
  fieldName?: string;
  errorMessage: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  metadata?: Record<string, any>;
}

/**
 * Interface for error trend analysis
 */
export interface ErrorTrendData {
  errorType: ErrorType;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageChange: number;
  timeFrame: string;
}

/**
 * Alert configuration for errors
 */
export interface ErrorAlertConfig {
  enabled: boolean;
  minSeverity: ErrorSeverity;
  notifyEmails: string[];
  throttleMinutes: number;
  lastAlertSent?: Date;
}

/**
 * Service for tracking and analyzing form errors
 */
class FormErrorTrackingService {
  private errorCounts: Record<string, number> = {};
  private fieldErrorCounts: Record<string, Record<string, number>> = {};
  private errorHistory: ErrorTrackingData[] = [];
  private alertConfig: ErrorAlertConfig = {
    enabled: true,
    minSeverity: ErrorSeverity.HIGH,
    notifyEmails: [],
    throttleMinutes: 30
  };
  private trackingEnabled = true;
  private lastErrorTimestamps: Record<ErrorType, number[]> = {
    [ErrorType.VALIDATION]: [],
    [ErrorType.SUBMISSION]: [],
    [ErrorType.API]: [],
    [ErrorType.CONNECTIVITY]: [],
    [ErrorType.UNKNOWN]: []
  };
  
  /**
   * Initialize the error tracking service
   */
  constructor() {
    this.detectTrackingPermission();
    this.loadAlertConfig();
  }
  
  /**
   * Check if tracking is permitted (respects Do Not Track settings)
   */
  private detectTrackingPermission(): void {
    // Check if DNT is enabled in the browser
    if (typeof window !== 'undefined' && 
        (window.navigator.doNotTrack === '1' || 
         window.navigator.doNotTrack === 'yes' || 
         window.doNotTrack === '1')) {
      this.trackingEnabled = false;
      console.info('Form error tracking disabled due to Do Not Track setting');
    }
  }

  /**
   * Load alert configuration from the database or environment
   */
  private async loadAlertConfig(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', 'error_alert_config')
        .single();

      if (error) {
        console.warn('Failed to load error alert config:', error.message);
        return;
      }

      if (data?.setting_value) {
        this.alertConfig = {
          ...this.alertConfig,
          ...JSON.parse(data.setting_value)
        };
      }
    } catch (error) {
      console.error('Error loading alert configuration:', error);
    }
  }
  
  /**
   * Determine error severity based on error type and context
   * @param errorType - Type of error
   * @param fieldName - Optional field name for context
   * @param isRecurring - Whether this error has occurred multiple times
   * @returns The error severity level
   */
  private determineErrorSeverity(
    errorType: ErrorType,
    fieldName?: string,
    isRecurring = false
  ): ErrorSeverity {
    // Critical required fields get higher severity
    const criticalFields = ['email', 'phone', 'telephone', 'afm', 'αφμ', 'tax_id'];
    const isRequiredField = fieldName && criticalFields.some(f => 
      fieldName.toLowerCase().includes(f)
    );
    
    // Recurring errors get higher severity
    if (isRecurring) {
      const errorCount = this.errorCounts[errorType] || 0;
      
      // Critical severity for frequently recurring errors
      if (errorCount > 10) {
        return ErrorSeverity.CRITICAL;
      }
      
      // High severity for moderately recurring errors
      if (errorCount > 3) {
        return ErrorSeverity.HIGH;
      }
    }
    
    // Determine by error type
    switch (errorType) {
      case ErrorType.API:
        return isRecurring ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH;
      case ErrorType.SUBMISSION:
        return isRecurring ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
      case ErrorType.CONNECTIVITY:
        return isRecurring ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
      case ErrorType.VALIDATION:
        if (isRequiredField) {
          return isRecurring ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
        }
        return isRecurring ? ErrorSeverity.MEDIUM : ErrorSeverity.LOW;
      default:
        return ErrorSeverity.LOW;
    }
  }
  
  /**
   * Track a validation error on a form field
   * @param formLinkId - The ID of the form link
   * @param fieldName - Name of the field with error
   * @param errorMessage - The validation error message
   */
  public async trackValidationError(
    formLinkId: string,
    fieldName: string,
    errorMessage: string
  ): Promise<void> {
    if (!this.trackingEnabled) return;
    
    // Update error counts for recurrence detection
    this.errorCounts[ErrorType.VALIDATION] = (this.errorCounts[ErrorType.VALIDATION] || 0) + 1;
    
    // Track time of error for trend analysis
    this.lastErrorTimestamps[ErrorType.VALIDATION].push(Date.now());
    
    // Track field-specific error counts
    if (!this.fieldErrorCounts[formLinkId]) {
      this.fieldErrorCounts[formLinkId] = {};
    }
    this.fieldErrorCounts[formLinkId][fieldName] = 
      (this.fieldErrorCounts[formLinkId][fieldName] || 0) + 1;
    
    // Determine if this is a recurring error on this field
    const isRecurring = this.fieldErrorCounts[formLinkId][fieldName] > 1;
    
    // Determine severity
    const severity = this.determineErrorSeverity(
      ErrorType.VALIDATION, 
      fieldName,
      isRecurring
    );
    
    const errorData: ErrorTrackingData = {
      formLinkId,
      fieldName,
      errorMessage,
      errorType: ErrorType.VALIDATION,
      severity,
      metadata: {
        occurrenceCount: this.fieldErrorCounts[formLinkId][fieldName],
        isRecurring
      }
    };
    
    // Track both in error tracking and general form tracking
    await Promise.all([
      this.trackError(errorData),
      formTrackingService.trackValidationError(formLinkId, fieldName, errorMessage)
    ]);
    
    // Check if this error needs an alert
    if (severity === ErrorSeverity.CRITICAL || 
        (severity === ErrorSeverity.HIGH && isRecurring)) {
      await this.triggerErrorAlert(errorData);
    }
  }
  
  /**
   * Track a submission error
   * @param formLinkId - The ID of the form link
   * @param errorMessage - The error message
   * @param metadata - Additional error details
   */
  public async trackSubmissionError(
    formLinkId: string,
    errorMessage: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.trackingEnabled) return;
    
    this.errorCounts[ErrorType.SUBMISSION] = (this.errorCounts[ErrorType.SUBMISSION] || 0) + 1;
    this.lastErrorTimestamps[ErrorType.SUBMISSION].push(Date.now());
    
    const isRecurring = this.errorCounts[ErrorType.SUBMISSION] > 1;
    const severity = this.determineErrorSeverity(ErrorType.SUBMISSION, undefined, isRecurring);
    
    const errorData: ErrorTrackingData = {
      formLinkId,
      errorMessage,
      errorType: ErrorType.SUBMISSION,
      severity,
      metadata: {
        ...metadata,
        occurrenceCount: this.errorCounts[ErrorType.SUBMISSION],
        isRecurring
      }
    };
    
    await this.trackError(errorData);
    
    // Submission errors are important - trigger alerts for high severity
    if (severity >= ErrorSeverity.HIGH) {
      await this.triggerErrorAlert(errorData);
    }
  }
  
  /**
   * Track an API error during form processing
   * @param formLinkId - The ID of the form link
   * @param errorMessage - The error message
   * @param endpoint - The API endpoint that failed
   * @param statusCode - HTTP status code if available
   */
  public async trackApiError(
    formLinkId: string,
    errorMessage: string,
    endpoint?: string,
    statusCode?: number
  ): Promise<void> {
    if (!this.trackingEnabled) return;
    
    this.errorCounts[ErrorType.API] = (this.errorCounts[ErrorType.API] || 0) + 1;
    this.lastErrorTimestamps[ErrorType.API].push(Date.now());
    
    const isRecurring = this.errorCounts[ErrorType.API] > 1;
    const severity = this.determineErrorSeverity(ErrorType.API, undefined, isRecurring);
    
    // API errors with 5xx status codes are critical
    const finalSeverity = statusCode && statusCode >= 500 ? 
      ErrorSeverity.CRITICAL : severity;
    
    const errorData: ErrorTrackingData = {
      formLinkId,
      errorMessage,
      errorType: ErrorType.API,
      severity: finalSeverity,
      metadata: {
        endpoint,
        statusCode,
        occurrenceCount: this.errorCounts[ErrorType.API],
        isRecurring
      }
    };
    
    await this.trackError(errorData);
    
    // API errors typically need immediate attention
    if (finalSeverity >= ErrorSeverity.HIGH) {
      await this.triggerErrorAlert(errorData);
    }
  }
  
  /**
   * Track a connectivity error
   * @param formLinkId - The ID of the form link
   * @param errorMessage - The error message
   */
  public async trackConnectivityError(
    formLinkId: string,
    errorMessage: string
  ): Promise<void> {
    if (!this.trackingEnabled) return;
    
    this.errorCounts[ErrorType.CONNECTIVITY] = (this.errorCounts[ErrorType.CONNECTIVITY] || 0) + 1;
    this.lastErrorTimestamps[ErrorType.CONNECTIVITY].push(Date.now());
    
    const isRecurring = this.errorCounts[ErrorType.CONNECTIVITY] > 1;
    
    const errorData: ErrorTrackingData = {
      formLinkId,
      errorMessage,
      errorType: ErrorType.CONNECTIVITY,
      severity: this.determineErrorSeverity(ErrorType.CONNECTIVITY, undefined, isRecurring),
      metadata: {
        networkStatus: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
        occurrenceCount: this.errorCounts[ErrorType.CONNECTIVITY],
        isRecurring
      }
    };
    
    await this.trackError(errorData);
    
    // Only alert for recurring connectivity issues to avoid noise
    if (isRecurring && this.errorCounts[ErrorType.CONNECTIVITY] > 5) {
      await this.triggerErrorAlert(errorData);
    }
  }
  
  /**
   * Track any type of error by saving to database
   * @param data - The error tracking data
   */
  private async trackError(data: ErrorTrackingData): Promise<void> {
    if (!this.trackingEnabled) return;
    
    // Update error counts for statistics
    this.errorCounts[data.errorType] = (this.errorCounts[data.errorType] || 0) + 1;
    
    // Update field-specific error counts
    if (data.fieldName) {
      if (!this.fieldErrorCounts[data.formLinkId]) {
        this.fieldErrorCounts[data.formLinkId] = {};
      }
      this.fieldErrorCounts[data.formLinkId][data.fieldName] = 
        (this.fieldErrorCounts[data.formLinkId][data.fieldName] || 0) + 1;
    }
    
    try {
      // Store in local history for trend analysis
      this.errorHistory.push(data);
      
      // Limit history size to prevent memory issues
      if (this.errorHistory.length > 100) {
        this.errorHistory = this.errorHistory.slice(-100);
      }
      
      // In development, just log the tracking data
      if (import.meta.env.MODE === 'development') {
        console.info('Error tracked:', data);
        return;
      }
      
      // In production, store in the database
      const { error } = await supabase
        .from('form_error_logs')
        .insert({
          form_link_id: data.formLinkId,
          session_id: data.sessionId,
          field_name: data.fieldName,
          error_message: data.errorMessage,
          error_type: data.errorType,
          severity: data.severity,
          metadata: data.metadata
        });
      
      if (error) {
        console.error('Failed to log form error:', error);
      }
    } catch (err) {
      console.error('Error in tracking form error:', err);
    }
  }
  
  /**
   * Trigger an alert for critical errors
   * @param data - The error tracking data
   */
  private async triggerErrorAlert(data: ErrorTrackingData): Promise<void> {
    if (!this.alertConfig.enabled) return;
    
    // Don't alert if severity is below threshold
    if (this.getSeverityValue(data.severity) < this.getSeverityValue(this.alertConfig.minSeverity)) {
      return;
    }
    
    // Check if we should throttle alerts
    if (this.alertConfig.lastAlertSent) {
      const now = new Date();
      const timeSinceLastAlert = now.getTime() - this.alertConfig.lastAlertSent.getTime();
      const throttleMs = this.alertConfig.throttleMinutes * 60 * 1000;
      
      if (timeSinceLastAlert < throttleMs) {
        console.info(`Alert throttled. Next alert available in ${Math.ceil((throttleMs - timeSinceLastAlert) / 60000)} minutes`);
        return;
      }
    }
    
    try {
      // Update last alert timestamp
      this.alertConfig.lastAlertSent = new Date();
      
      // Get form and customer info for better context
      const { data: formData, error: formError } = await supabase
        .from('customer_form_links')
        .select('id, customer_id, token, status')
        .eq('id', data.formLinkId)
        .single();
      
      if (formError) {
        console.error('Error fetching form data for alert:', formError);
      }
      
      // Create alert message
      const alertMessage = {
        title: `Form Error Alert: ${this.getErrorTypeName(data.errorType)} (${data.severity.toUpperCase()})`,
        formLink: formData?.token ? `Form token: ${formData.token}` : `Form ID: ${data.formLinkId}`,
        message: data.errorMessage,
        fieldName: data.fieldName || 'N/A',
        errorType: this.getErrorTypeName(data.errorType),
        severity: data.severity.toUpperCase(),
        timestamp: new Date().toISOString(),
        metadata: data.metadata
      };
      
      // Send alert via email if configured
      if (this.alertConfig.notifyEmails.length > 0) {
        await this.sendAlertEmails(alertMessage);
      }
      
      // Log alert to the database
      const { error: alertError } = await supabase
        .from('system_alerts')
        .insert({
          alert_type: 'form_error',
          severity: data.severity,
          message: JSON.stringify(alertMessage),
          is_resolved: false
        });
      
      if (alertError) {
        console.error('Failed to log error alert:', alertError);
      }
      
    } catch (err) {
      console.error('Error sending alert:', err);
    }
  }
  
  /**
   * Send alert emails to configured recipients
   * @param alertMessage - The alert message content
   */
  private async sendAlertEmails(alertMessage: any): Promise<void> {
    try {
      // In development, just log the email content
      if (import.meta.env.MODE === 'development') {
        console.info('Alert email would be sent to:', this.alertConfig.notifyEmails);
        console.info('Alert content:', alertMessage);
        return;
      }
      
      // In production, send actual emails
      // Implementation would depend on your email service
      // This is a placeholder for the actual implementation
      console.info('Sending alert emails to:', this.alertConfig.notifyEmails);
      
      // Example integration with email service
      /* 
      await emailService.sendEmail({
        to: this.alertConfig.notifyEmails,
        subject: alertMessage.title,
        template: 'error-alert',
        data: alertMessage
      });
      */
    } catch (err) {
      console.error('Failed to send alert emails:', err);
    }
  }
  
  /**
   * Convert severity enum to numeric value for comparison
   * @param severity - The severity enum value
   * @returns Numeric severity value
   */
  private getSeverityValue(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 4;
      case ErrorSeverity.HIGH: return 3;
      case ErrorSeverity.MEDIUM: return 2;
      case ErrorSeverity.LOW: return 1;
      default: return 0;
    }
  }
  
  /**
   * Get human-readable name for error type
   * @param errorType - The error type enum value
   * @returns Human-readable error type name
   */
  private getErrorTypeName(errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.VALIDATION: return 'Validation Error';
      case ErrorType.SUBMISSION: return 'Form Submission Error';
      case ErrorType.API: return 'API Error';
      case ErrorType.CONNECTIVITY: return 'Network Connectivity Error';
      default: return 'Unknown Error';
    }
  }

  /**
   * Get error statistics and analysis
   * @returns Object with error statistics and trends
   */
  public getErrorStatistics(): Record<string, any> {
    // Basic error counts
    const statistics = {
      totalErrors: Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0),
      errorsByType: { ...this.errorCounts },
      errorTrends: this.analyzeErrorTrends(),
      mostProblematicFields: this.getMostProblematicFields(),
      errorSeverityDistribution: this.getErrorSeverityDistribution(),
      recentErrors: this.errorHistory.slice(-10).reverse()
    };
    
    return statistics;
  }

  /**
   * Analyze error trends over time
   * @returns Array of error trend data
   */
  public analyzeErrorTrends(): ErrorTrendData[] {
    const trends: ErrorTrendData[] = [];
    const now = Date.now();
    
    // Analyze each error type
    Object.keys(this.lastErrorTimestamps).forEach(typeKey => {
      const errorType = typeKey as ErrorType;
      const timestamps = this.lastErrorTimestamps[errorType];
      
      if (timestamps.length === 0) return;
      
      // Get errors in the last hour and day for comparison
      const lastHourCount = timestamps.filter(time => now - time < 60 * 60 * 1000).length;
      const previousHourCount = timestamps.filter(time => 
        now - time >= 60 * 60 * 1000 && now - time < 2 * 60 * 60 * 1000
      ).length;
      
      // Calculate trend
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let percentageChange = 0;
      
      if (previousHourCount > 0) {
        percentageChange = Math.round(((lastHourCount - previousHourCount) / previousHourCount) * 100);
        
        if (percentageChange > 10) {
          trend = 'increasing';
        } else if (percentageChange < -10) {
          trend = 'decreasing';
        }
      }
      
      trends.push({
        errorType,
        count: lastHourCount,
        trend,
        percentageChange,
        timeFrame: 'lastHour'
      });
    });
    
    return trends;
  }

  /**
   * Get the most problematic fields based on error counts
   * @returns Array of problematic fields with error counts
   */
  private getMostProblematicFields(): Array<{fieldName: string, errorCount: number}> {
    const fieldErrors: Record<string, number> = {};
    
    // Combine error counts across all forms
    Object.values(this.fieldErrorCounts).forEach(formFields => {
      Object.entries(formFields).forEach(([fieldName, count]) => {
        fieldErrors[fieldName] = (fieldErrors[fieldName] || 0) + count;
      });
    });
    
    // Convert to array and sort by count descending
    return Object.entries(fieldErrors)
      .map(([fieldName, errorCount]) => ({ fieldName, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10); // Top 10 most problematic fields
  }

  /**
   * Get distribution of errors by severity
   * @returns Object with counts for each severity level
   */
  private getErrorSeverityDistribution(): Record<ErrorSeverity, number> {
    const distribution: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };
    
    this.errorHistory.forEach(error => {
      distribution[error.severity]++;
    });
    
    return distribution;
  }
  
  /**
   * Clear error tracking state
   * Useful for testing or when changing tracking scope
   */
  public clearErrorState(): void {
    this.errorCounts = {};
    this.fieldErrorCounts = {};
    this.errorHistory = [];
    this.lastErrorTimestamps = {
      [ErrorType.VALIDATION]: [],
      [ErrorType.SUBMISSION]: [],
      [ErrorType.API]: [],
      [ErrorType.CONNECTIVITY]: [],
      [ErrorType.UNKNOWN]: []
    };
  }
  
  /**
   * Configure error alert settings
   * @param config - The new alert configuration
   */
  public configureAlerts(config: Partial<ErrorAlertConfig>): void {
    this.alertConfig = {
      ...this.alertConfig,
      ...config
    };
    
    // Save configuration to database
    this.saveConfiguration();
  }

  private saveConfiguration(): void {
    if (!this.alertConfig) return;

    // Save configuration to database
    if (import.meta.env.MODE === 'production') {
      supabase
        .from('system_settings')
        .upsert({
          setting_key: 'form_error_alert_config',
          setting_value: JSON.stringify(this.alertConfig),
          modified_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save alert configuration:', error);
          }
        });
    }
  }
}

// Export as singleton instance
const formErrorTrackingService = new FormErrorTrackingService();
export default formErrorTrackingService; 