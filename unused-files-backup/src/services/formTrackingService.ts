import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * Types of form interactions to track
 */
export enum FormInteractionType {
  VIEW = 'form_view',
  START = 'form_start',
  STEP_COMPLETE = 'step_complete',
  FIELD_INTERACTION = 'field_interaction',
  VALIDATION_ERROR = 'validation_error',
  SUBMISSION = 'form_submission',
  ABANDONMENT = 'form_abandonment'
}

/**
 * Interface for form tracking data
 */
interface FormTrackingData {
  formLinkId: string;
  sessionId?: string;
  interactionType: FormInteractionType;
  stepName?: string;
  fieldName?: string;
  errorMessage?: string;
  deviceType?: string;
  deviceInfo?: any;
  timeSpent?: number;
  metadata?: Record<string, any>;
}

/**
 * Service for tracking form interactions and conversions
 */
class FormTrackingService {
  private sessionId: string | null = null;
  private formStartTime: number | null = null;
  private stepStartTimes: Record<string, number> = {};
  private fieldInteractions: Record<string, number> = {};
  private trackingEnabled = true;
  
  /**
   * Initialize the tracking service and generate a session ID
   */
  constructor() {
    this.sessionId = uuidv4();
    this.detectTrackingPermission();
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
      console.info('Form tracking disabled due to Do Not Track setting');
    }
  }
  
  /**
   * Get device information for tracking
   */
  private getDeviceInfo(): { deviceType: string, deviceInfo: any } {
    if (typeof window === 'undefined') {
      return { deviceType: 'unknown', deviceInfo: {} };
    }
    
    const userAgent = window.navigator.userAgent;
    let deviceType = 'Desktop';
    
    // Simple device detection
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
      deviceType = /iPad|Tablet|Kindle/i.test(userAgent) ? 'Tablet' : 'Smartphone';
    }
    
    // Collect basic device info but respect privacy
    const deviceInfo = {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      userAgent: window.navigator.userAgent,
      language: window.navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    return { deviceType, deviceInfo };
  }
  
  /**
   * Track a form view event
   * @param formLinkId - The ID of the form link being viewed
   */
  public async trackFormView(formLinkId: string): Promise<void> {
    if (!this.trackingEnabled) return;
    
    const { deviceType, deviceInfo } = this.getDeviceInfo();
    
    await this.trackInteraction({
      formLinkId,
      sessionId: this.sessionId || undefined,
      interactionType: FormInteractionType.VIEW,
      deviceType,
      deviceInfo
    });
  }
  
  /**
   * Track when a user starts filling out the form
   * @param formLinkId - The ID of the form link
   */
  public async trackFormStart(formLinkId: string): Promise<void> {
    if (!this.trackingEnabled) return;
    
    this.formStartTime = Date.now();
    const { deviceType, deviceInfo } = this.getDeviceInfo();
    
    await this.trackInteraction({
      formLinkId,
      sessionId: this.sessionId || undefined,
      interactionType: FormInteractionType.START,
      deviceType,
      deviceInfo
    });
  }
  
  /**
   * Track completion of a form step
   * @param formLinkId - The ID of the form link
   * @param stepName - Name of the completed step
   */
  public async trackStepComplete(formLinkId: string, stepName: string): Promise<void> {
    if (!this.trackingEnabled) return;
    
    const timeSpent = this.getStepTimeSpent(stepName);
    
    await this.trackInteraction({
      formLinkId,
      sessionId: this.sessionId || undefined,
      interactionType: FormInteractionType.STEP_COMPLETE,
      stepName,
      timeSpent,
      deviceType: this.getDeviceInfo().deviceType
    });
    
    // Start timing for the next step
    this.startStepTiming(stepName);
  }
  
  /**
   * Start timing for a form step
   * @param stepName - Name of the step to start timing
   */
  public startStepTiming(stepName: string): void {
    if (!this.trackingEnabled) return;
    this.stepStartTimes[stepName] = Date.now();
  }
  
  /**
   * Get time spent on a step in seconds
   * @param stepName - Name of the step
   * @returns Time spent in seconds, or undefined if no start time exists
   */
  private getStepTimeSpent(stepName: string): number | undefined {
    if (!this.stepStartTimes[stepName]) return undefined;
    
    const timeSpentMs = Date.now() - this.stepStartTimes[stepName];
    return Math.round(timeSpentMs / 1000); // Convert to seconds
  }
  
  /**
   * Track field interaction (focus, change, etc.)
   * @param formLinkId - The ID of the form link
   * @param fieldName - Name of the form field
   * @param interactionCount - Number of interactions with this field
   */
  public async trackFieldInteraction(
    formLinkId: string, 
    fieldName: string, 
    interactionType: 'focus' | 'change' | 'blur' = 'change'
  ): Promise<void> {
    if (!this.trackingEnabled) return;
    
    // Increment interaction count for this field
    this.fieldInteractions[fieldName] = (this.fieldInteractions[fieldName] || 0) + 1;
    
    await this.trackInteraction({
      formLinkId,
      sessionId: this.sessionId || undefined,
      interactionType: FormInteractionType.FIELD_INTERACTION,
      fieldName,
      metadata: {
        interactionType,
        interactionCount: this.fieldInteractions[fieldName]
      }
    });
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
    
    await this.trackInteraction({
      formLinkId,
      sessionId: this.sessionId || undefined,
      interactionType: FormInteractionType.VALIDATION_ERROR,
      fieldName,
      errorMessage
    });
  }
  
  /**
   * Track form submission (successful or failed)
   * @param formLinkId - The ID of the form link
   * @param success - Whether submission was successful
   * @param errorMessage - Error message if submission failed
   */
  public async trackSubmission(
    formLinkId: string, 
    success: boolean, 
    errorMessage?: string
  ): Promise<void> {
    if (!this.trackingEnabled) return;
    
    let timeSpent: number | undefined;
    
    if (this.formStartTime) {
      timeSpent = Math.round((Date.now() - this.formStartTime) / 1000);
    }
    
    await this.trackInteraction({
      formLinkId,
      sessionId: this.sessionId || undefined,
      interactionType: FormInteractionType.SUBMISSION,
      timeSpent,
      metadata: {
        success,
        errorMessage
      }
    });
  }
  
  /**
   * Track form abandonment
   * @param formLinkId - The ID of the form link
   * @param lastStepName - Name of the last step reached
   * @param lastFieldName - Name of the last field interacted with
   */
  public async trackAbandonment(
    formLinkId: string, 
    lastStepName?: string, 
    lastFieldName?: string
  ): Promise<void> {
    if (!this.trackingEnabled) return;
    
    let timeSpent: number | undefined;
    
    if (this.formStartTime) {
      timeSpent = Math.round((Date.now() - this.formStartTime) / 1000);
    }
    
    await this.trackInteraction({
      formLinkId,
      sessionId: this.sessionId || undefined,
      interactionType: FormInteractionType.ABANDONMENT,
      stepName: lastStepName,
      fieldName: lastFieldName,
      timeSpent,
      metadata: {
        fieldInteractions: this.fieldInteractions
      }
    });
  }
  
  /**
   * Track any form interaction by saving to database
   * @param data - The tracking data to save
   */
  private async trackInteraction(data: FormTrackingData): Promise<void> {
    if (!this.trackingEnabled) return;
    
    try {
      // In development, just log the tracking data
      if (process.env.NODE_ENV === 'development') {
        console.log('[FormTracking]', data.interactionType, data);
        return;
      }
      
      // In production, save to database
      const { error } = await supabase
        .from('form_tracking_events')
        .insert({
          form_link_id: data.formLinkId,
          session_id: data.sessionId,
          interaction_type: data.interactionType,
          step_name: data.stepName,
          field_name: data.fieldName,
          error_message: data.errorMessage,
          device_type: data.deviceType,
          device_info: data.deviceInfo,
          time_spent: data.timeSpent,
          metadata: data.metadata
        });
      
      if (error) {
        console.error('Error tracking form interaction:', error);
      }
    } catch (error) {
      console.error('Error tracking form interaction:', error);
    }
  }
  
  /**
   * Setup window beforeunload handler to track abandonment
   * @param formLinkId - The ID of the form link
   * @param getCurrentStep - Function to get current step name
   * @param getCurrentField - Function to get current field name
   */
  public setupAbandonmentTracking(
    formLinkId: string,
    getCurrentStep?: () => string | undefined,
    getCurrentField?: () => string | undefined
  ): () => void {
    if (!this.trackingEnabled || typeof window === 'undefined') {
      return () => {}; // Return no-op cleanup function
    }
    
    const handleBeforeUnload = () => {
      // Only track abandonment if the form was started
      if (this.formStartTime) {
        const lastStep = getCurrentStep?.();
        const lastField = getCurrentField?.();
        
        // Use navigator.sendBeacon for reliability during page unload
        if (navigator.sendBeacon) {
          const data = {
            formLinkId,
            sessionId: this.sessionId,
            interactionType: FormInteractionType.ABANDONMENT,
            stepName: lastStep,
            fieldName: lastField,
            timeSpent: this.formStartTime ? Math.round((Date.now() - this.formStartTime) / 1000) : undefined,
            metadata: { fieldInteractions: this.fieldInteractions }
          };
          
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          navigator.sendBeacon('/api/track-form-abandonment', blob);
        } else {
          // Fallback to async tracking
          this.trackAbandonment(formLinkId, lastStep, lastField);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
}

// Create singleton instance
export const formTrackingService = new FormTrackingService();

export default formTrackingService; 