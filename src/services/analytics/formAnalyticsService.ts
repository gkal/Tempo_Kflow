/**
 * Form Analytics Service
 * 
 * This service tracks form usage statistics, user behavior, and submission patterns
 * to provide insights into how forms are being used and where improvements can be made.
 */

import { supabase } from '@/lib/supabaseClient';

// Types for form analytics
export interface FormSubmissionAnalytics {
  formId: string;
  submissionId: string;
  userId?: string;
  startTime: string;
  completionTime: string;
  timeToComplete: number; // in seconds
  deviceType: string;
  browserInfo: string;
  isComplete: boolean;
  errorCount: number;
  fieldInteractions: FieldInteraction[];
  source?: string;
  referrer?: string;
}

export interface FieldInteraction {
  fieldId: string;
  fieldName: string;
  interactionCount: number;
  focusTime: number; // total time field was in focus (ms)
  errorCount: number;
  changeCount: number;
}

export interface FormAnalyticsReport {
  totalSubmissions: number;
  completionRate: number;
  averageCompletionTime: number;
  submissionsByDevice: Record<string, number>;
  submissionsByBrowser: Record<string, number>;
  mostProblematicFields: FieldAnalytics[];
  submissionTrends: SubmissionTrend[];
  conversionRate: number;
  abandonmentRate: number;
  peakUsageTimes: UsageTime[];
}

export interface FieldAnalytics {
  fieldId: string;
  fieldName: string;
  averageInteractionTime: number;
  errorRate: number;
  abandonmentRate: number;
}

export interface SubmissionTrend {
  date: string;
  submissions: number;
  completions: number;
}

export interface UsageTime {
  hour: number;
  day: number;
  submissions: number;
}

export interface FormAnalyticsFilter {
  formId?: string;
  startDate?: string;
  endDate?: string;
  isComplete?: boolean;
  deviceType?: string;
  source?: string;
}

/**
 * Form Analytics Service
 */
const FormAnalyticsService = {
  /**
   * Tracks a form submission
   * @param analytics Form submission analytics data
   * @returns True if recording was successful
   */
  async trackFormSubmission(analytics: FormSubmissionAnalytics): Promise<boolean> {
    try {
      // Insert main submission record
      const { error: submissionError } = await supabase
        .from('form_submission_analytics')
        .insert({
          form_id: analytics.formId,
          submission_id: analytics.submissionId,
          user_id: analytics.userId,
          start_time: analytics.startTime,
          completion_time: analytics.completionTime,
          time_to_complete: analytics.timeToComplete,
          device_type: analytics.deviceType,
          browser_info: analytics.browserInfo,
          is_complete: analytics.isComplete,
          error_count: analytics.errorCount,
          source: analytics.source,
          referrer: analytics.referrer
        });

      if (submissionError) {
        console.error('Error tracking form submission:', submissionError);
        return false;
      }

      // Insert field interactions
      if (analytics.fieldInteractions.length > 0) {
        const fieldInteractions = analytics.fieldInteractions.map(field => ({
          submission_id: analytics.submissionId,
          field_id: field.fieldId,
          field_name: field.fieldName,
          interaction_count: field.interactionCount,
          focus_time: field.focusTime,
          error_count: field.errorCount,
          change_count: field.changeCount
        }));

        const { error: fieldError } = await supabase
          .from('form_field_interactions')
          .insert(fieldInteractions);

        if (fieldError) {
          console.error('Error tracking field interactions:', fieldError);
          // Continue since the main submission was recorded successfully
        }
      }

      return true;
    } catch (error) {
      console.error('Exception tracking form submission:', error);
      return false;
    }
  },

  /**
   * Gets form analytics report
   * @param filter Filter criteria for the report
   * @returns Form analytics report
   */
  async getFormAnalyticsReport(filter: FormAnalyticsFilter): Promise<FormAnalyticsReport | null> {
    try {
      // Apply filters to query
      let query = supabase
        .from('form_submission_analytics')
        .select('*');

      if (filter.formId) {
        query = query.eq('form_id', filter.formId);
      }

      if (filter.startDate) {
        query = query.gte('start_time', filter.startDate);
      }

      if (filter.endDate) {
        query = query.lte('completion_time', filter.endDate);
      }

      if (filter.isComplete !== undefined) {
        query = query.eq('is_complete', filter.isComplete);
      }

      if (filter.deviceType) {
        query = query.eq('device_type', filter.deviceType);
      }

      if (filter.source) {
        query = query.eq('source', filter.source);
      }

      // Execute query
      const { data: submissions, error } = await query;

      if (error) {
        console.error('Error fetching form analytics:', error);
        return null;
      }

      // If no submissions found, return default report
      if (!submissions || submissions.length === 0) {
        return this.getEmptyReport();
      }

      // Calculate total submissions
      const totalSubmissions = submissions.length;

      // Calculate completion rate
      const completedSubmissions = submissions.filter(sub => sub.is_complete).length;
      const completionRate = (completedSubmissions / totalSubmissions) * 100;

      // Calculate average completion time (only for completed submissions)
      const completedTimes = submissions
        .filter(sub => sub.is_complete && sub.time_to_complete)
        .map(sub => sub.time_to_complete);
      
      const averageCompletionTime = completedTimes.length > 0
        ? completedTimes.reduce((sum, time) => sum + time, 0) / completedTimes.length
        : 0;

      // Calculate submissions by device
      const submissionsByDevice = submissions.reduce((acc, sub) => {
        const device = sub.device_type || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate submissions by browser
      const submissionsByBrowser = submissions.reduce((acc, sub) => {
        // Extract browser name from browser info
        const browserMatch = (sub.browser_info || '').match(/^([^\s/]+)/);
        const browser = browserMatch ? browserMatch[1] : 'unknown';
        
        acc[browser] = (acc[browser] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get field analytics data
      const { data: fieldInteractions, error: fieldError } = await supabase
        .from('form_field_interactions')
        .select('*')
        .in('submission_id', submissions.map(sub => sub.submission_id));

      if (fieldError) {
        console.error('Error fetching field interactions:', fieldError);
        // Continue with partial report
      }

      // Calculate most problematic fields
      const fieldStats = new Map<string, { 
        fieldId: string; 
        fieldName: string; 
        totalInteractionTime: number;
        totalInteractions: number;
        errorCount: number;
        totalSubmissions: number;
        abandonmentCount: number;
      }>();

      // Process field interactions
      if (fieldInteractions && fieldInteractions.length > 0) {
        fieldInteractions.forEach(interaction => {
          const fieldId = interaction.field_id;
          const stats = fieldStats.get(fieldId) || {
            fieldId,
            fieldName: interaction.field_name,
            totalInteractionTime: 0,
            totalInteractions: 0,
            errorCount: 0,
            totalSubmissions: 0,
            abandonmentCount: 0
          };

          stats.totalInteractionTime += interaction.focus_time || 0;
          stats.totalInteractions += interaction.interaction_count || 0;
          stats.errorCount += interaction.error_count || 0;
          stats.totalSubmissions += 1;

          // Check if this field was the last one interacted with before abandonment
          const submission = submissions.find(sub => sub.submission_id === interaction.submission_id);
          if (submission && !submission.is_complete) {
            stats.abandonmentCount += 1;
          }

          fieldStats.set(fieldId, stats);
        });
      }

      // Calculate field analytics metrics
      const mostProblematicFields = Array.from(fieldStats.values())
        .map(stats => ({
          fieldId: stats.fieldId,
          fieldName: stats.fieldName,
          averageInteractionTime: stats.totalInteractions > 0 
            ? stats.totalInteractionTime / stats.totalInteractions 
            : 0,
          errorRate: stats.totalSubmissions > 0 
            ? (stats.errorCount / stats.totalSubmissions) * 100 
            : 0,
          abandonmentRate: stats.totalSubmissions > 0 
            ? (stats.abandonmentCount / stats.totalSubmissions) * 100 
            : 0
        }))
        .sort((a, b) => (b.errorRate + b.abandonmentRate) - (a.errorRate + a.abandonmentRate))
        .slice(0, 5);

      // Calculate submission trends by day
      const submissionsByDate = new Map<string, { submissions: number; completions: number }>();
      
      submissions.forEach(sub => {
        const date = new Date(sub.start_time).toISOString().split('T')[0];
        const current = submissionsByDate.get(date) || { submissions: 0, completions: 0 };
        
        current.submissions += 1;
        if (sub.is_complete) {
          current.completions += 1;
        }
        
        submissionsByDate.set(date, current);
      });

      const submissionTrends = Array.from(submissionsByDate.entries())
        .map(([date, stats]) => ({
          date,
          submissions: stats.submissions,
          completions: stats.completions
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate conversion rate
      const conversionRate = totalSubmissions > 0 
        ? (completedSubmissions / totalSubmissions) * 100 
        : 0;

      // Calculate abandonment rate
      const abandonmentRate = totalSubmissions > 0 
        ? ((totalSubmissions - completedSubmissions) / totalSubmissions) * 100 
        : 0;

      // Calculate peak usage times
      const usageByHour = new Array(24).fill(0).map((_, hour) => ({
        hour,
        day: -1, // All days combined
        submissions: 0
      }));

      const usageByDayAndHour = Array(7).fill(0).map((_, day) => 
        Array(24).fill(0).map((_, hour) => ({
          hour,
          day,
          submissions: 0
        }))
      ).flat();

      submissions.forEach(sub => {
        const date = new Date(sub.start_time);
        const hour = date.getHours();
        const day = date.getDay(); // 0-6, 0 is Sunday
        
        // Increment hour count
        usageByHour[hour].submissions += 1;
        
        // Increment day+hour count
        const dayHourIdx = usageByDayAndHour.findIndex(item => item.day === day && item.hour === hour);
        if (dayHourIdx >= 0) {
          usageByDayAndHour[dayHourIdx].submissions += 1;
        }
      });

      // Combine and sort peak usage times
      const peakUsageTimes = [
        ...usageByHour,
        ...usageByDayAndHour
      ].sort((a, b) => b.submissions - a.submissions)
       .slice(0, 10);

      // Return complete report
      return {
        totalSubmissions,
        completionRate,
        averageCompletionTime,
        submissionsByDevice,
        submissionsByBrowser,
        mostProblematicFields,
        submissionTrends,
        conversionRate,
        abandonmentRate,
        peakUsageTimes
      };
    } catch (error) {
      console.error('Exception getting form analytics report:', error);
      return null;
    }
  },

  /**
   * Gets a list of forms with their submission counts
   * @returns List of forms with analytics summary
   */
  async getFormsList(): Promise<{ formId: string; formName: string; submissions: number; completionRate: number }[]> {
    try {
      const { data, error } = await supabase.rpc('get_forms_analytics_summary');

      if (error) {
        console.error('Error fetching forms list with analytics:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        formId: item.form_id,
        formName: item.form_name || `Form ${item.form_id}`,
        submissions: item.total_submissions,
        completionRate: item.completion_rate
      }));
    } catch (error) {
      console.error('Exception getting forms list with analytics:', error);
      return [];
    }
  },

  /**
   * Creates JavaScript tracking code for a form
   * @param formId Form ID to track
   * @returns JavaScript tracking code as a string
   */
  generateTrackingCode(formId: string): string {
    // Generate a JavaScript snippet that can be included in forms
    // to track analytics data
    return `
<script>
// Form Analytics Tracking Code - Form ID: ${formId}
(function() {
  const formId = "${formId}";
  const startTime = new Date().toISOString();
  const submissionId = 'sub_' + Math.random().toString(36).substring(2, 15);
  let fieldInteractions = {};
  let fieldFocusTimes = {};
  let currentField = null;
  let focusStartTime = null;
  let errorCount = 0;
  
  // Detect browser and device info
  const browserInfo = navigator.userAgent;
  const deviceType = /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) 
    ? 'mobile' 
    : 'desktop';
  
  // Track field interactions
  document.addEventListener('focusin', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      const fieldId = e.target.id || e.target.name;
      const fieldName = e.target.getAttribute('data-field-name') || e.target.name || e.target.id;
      
      if (fieldId) {
        // End timing for previous field if any
        if (currentField && focusStartTime) {
          const focusTime = (new Date().getTime() - focusStartTime);
          fieldFocusTimes[currentField] = (fieldFocusTimes[currentField] || 0) + focusTime;
        }
        
        // Start timing for new field
        currentField = fieldId;
        focusStartTime = new Date().getTime();
        
        // Initialize field tracking if needed
        if (!fieldInteractions[fieldId]) {
          fieldInteractions[fieldId] = {
            fieldId,
            fieldName,
            interactionCount: 0,
            focusTime: 0,
            errorCount: 0,
            changeCount: 0
          };
        }
        
        fieldInteractions[fieldId].interactionCount++;
      }
    }
  });
  
  // Track field changes
  document.addEventListener('change', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      const fieldId = e.target.id || e.target.name;
      
      if (fieldId && fieldInteractions[fieldId]) {
        fieldInteractions[fieldId].changeCount++;
      }
    }
  });
  
  // Track field errors
  document.addEventListener('invalid', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      const fieldId = e.target.id || e.target.name;
      
      if (fieldId && fieldInteractions[fieldId]) {
        fieldInteractions[fieldId].errorCount++;
        errorCount++;
      }
    }
  }, true);
  
  // End timing when leaving a field
  document.addEventListener('focusout', function(e) {
    if (currentField && focusStartTime) {
      const focusTime = (new Date().getTime() - focusStartTime);
      fieldFocusTimes[currentField] = (fieldFocusTimes[currentField] || 0) + focusTime;
      focusStartTime = null;
    }
  });
  
  // Track form submission
  document.querySelector('form').addEventListener('submit', function(e) {
    // End timing for current field if any
    if (currentField && focusStartTime) {
      const focusTime = (new Date().getTime() - focusStartTime);
      fieldFocusTimes[currentField] = (fieldFocusTimes[currentField] || 0) + focusTime;
    }
    
    // Prepare analytics data
    const completionTime = new Date().toISOString();
    const timeToComplete = Math.round((new Date().getTime() - new Date(startTime).getTime()) / 1000);
    
    // Add focus times to field interactions
    Object.keys(fieldInteractions).forEach(fieldId => {
      fieldInteractions[fieldId].focusTime = fieldFocusTimes[fieldId] || 0;
    });
    
    // Prepare data for submission
    const analyticsData = {
      formId,
      submissionId,
      startTime,
      completionTime,
      timeToComplete,
      deviceType,
      browserInfo,
      isComplete: true,
      errorCount,
      fieldInteractions: Object.values(fieldInteractions),
      source: document.referrer || window.location.href,
      referrer: document.referrer
    };
    
    // Send analytics data
    navigator.sendBeacon('/api/analytics/form-submission', JSON.stringify(analyticsData));
  });
  
  // Track form abandonment
  window.addEventListener('beforeunload', function() {
    // End timing for current field if any
    if (currentField && focusStartTime) {
      const focusTime = (new Date().getTime() - focusStartTime);
      fieldFocusTimes[currentField] = (fieldFocusTimes[currentField] || 0) + focusTime;
    }
    
    // Only track abandonment if form has been interacted with but not submitted
    if (Object.keys(fieldInteractions).length > 0) {
      // Prepare analytics data
      const completionTime = new Date().toISOString();
      const timeToComplete = Math.round((new Date().getTime() - new Date(startTime).getTime()) / 1000);
      
      // Add focus times to field interactions
      Object.keys(fieldInteractions).forEach(fieldId => {
        fieldInteractions[fieldId].focusTime = fieldFocusTimes[fieldId] || 0;
      });
      
      // Prepare data for submission
      const analyticsData = {
        formId,
        submissionId,
        startTime,
        completionTime,
        timeToComplete,
        deviceType,
        browserInfo,
        isComplete: false,
        errorCount,
        fieldInteractions: Object.values(fieldInteractions),
        source: document.referrer || window.location.href,
        referrer: document.referrer
      };
      
      // Send analytics data
      navigator.sendBeacon('/api/analytics/form-submission', JSON.stringify(analyticsData));
    }
  });
})();
</script>
`;
  },

  /**
   * Returns an empty report for when no data is available
   * @returns Empty form analytics report
   */
  getEmptyReport(): FormAnalyticsReport {
    return {
      totalSubmissions: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      submissionsByDevice: {},
      submissionsByBrowser: {},
      mostProblematicFields: [],
      submissionTrends: [],
      conversionRate: 0,
      abandonmentRate: 0,
      peakUsageTimes: []
    };
  }
};

export default FormAnalyticsService; 