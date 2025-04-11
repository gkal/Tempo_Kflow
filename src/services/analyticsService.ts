import { supabase } from '@/lib/supabaseClient';
import { format, subDays, addDays, parse } from 'date-fns';

// Define the interface for analytics data
interface FormAnalyticsData {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  conversionRate: number;
  averageCompletionTime: number;
  viewsCount: number;
  abandonmentRate: number;
  dailySubmissions: {
    date: string;
    count: number;
    approved: number;
    rejected: number;
  }[];
  deviceDistribution: {
    device: string;
    count: number;
    percentage: number;
  }[];
  errorData: {
    fieldName: string;
    errorCount: number;
    percentage: number;
  }[];
  timeOfDayDistribution: {
    hour: number;
    count: number;
  }[];
  formStepAbandonment: {
    step: string;
    abandonCount: number;
    percentage: number;
  }[];
}

interface AnalyticsParams {
  startDate: string;
  endDate: string;
}

/**
 * Fetch form analytics data based on date range
 * @param params - Start and end date for analytics
 * @returns - Promise with analytics data
 */
export const fetchFormAnalytics = async (params: AnalyticsParams): Promise<FormAnalyticsData> => {
  const { startDate, endDate } = params;
  
  // For production, uncomment this code to fetch real data
  /*
  try {
    // Fetch form submissions within the date range
    const { data: submissions, error: submissionsError } = await supabase
      .from('customer_form_links')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('is_deleted', false);
    
    if (submissionsError) {
      console.error('Error fetching form submissions:', submissionsError);
      throw new Error(submissionsError.message);
    }
    
    // Calculate total submissions
    const totalSubmissions = submissions.length;
    
    // Calculate submissions by status
    const pendingSubmissions = submissions.filter(form => form.status === 'pending').length;
    const approvedSubmissions = submissions.filter(form => form.status === 'approved').length;
    const rejectedSubmissions = submissions.filter(form => form.status === 'rejected').length;
    
    // Calculate views (including those that didn't result in submissions)
    const { data: views, error: viewsError } = await supabase
      .from('form_view_logs')
      .select('*')
      .gte('viewed_at', startDate)
      .lte('viewed_at', endDate);
    
    if (viewsError) {
      console.error('Error fetching form views:', viewsError);
      throw new Error(viewsError.message);
    }
    
    const viewsCount = views.length;
    
    // Calculate conversion rate
    const conversionRate = viewsCount > 0 ? totalSubmissions / viewsCount : 0;
    
    // Calculate average completion time
    let totalCompletionTime = 0;
    let completedFormsCount = 0;
    
    submissions.forEach(submission => {
      if (submission.started_at && submission.submitted_at) {
        const startTime = new Date(submission.started_at).getTime();
        const endTime = new Date(submission.submitted_at).getTime();
        const completionTime = (endTime - startTime) / 1000; // in seconds
        
        totalCompletionTime += completionTime;
        completedFormsCount++;
      }
    });
    
    const averageCompletionTime = completedFormsCount > 0 
      ? Math.round(totalCompletionTime / completedFormsCount) 
      : 0;
    
    // Calculate abandonment rate
    const formStarts = views.filter(view => view.interaction_type === 'form_start').length;
    const abandonmentRate = formStarts > 0 
      ? (formStarts - totalSubmissions) / formStarts 
      : 0;
    
    // Group submissions by date
    const submissionsByDate = {};
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Initialize all dates in range
    let currentDate = startDateObj;
    while (currentDate <= endDateObj) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      submissionsByDate[dateStr] = {
        count: 0,
        approved: 0,
        rejected: 0
      };
      currentDate = addDays(currentDate, 1);
    }
    
    // Fill in actual data
    submissions.forEach(submission => {
      const submissionDate = format(new Date(submission.created_at), 'yyyy-MM-dd');
      
      if (submissionsByDate[submissionDate]) {
        submissionsByDate[submissionDate].count++;
        
        if (submission.status === 'approved') {
          submissionsByDate[submissionDate].approved++;
        } else if (submission.status === 'rejected') {
          submissionsByDate[submissionDate].rejected++;
        }
      }
    });
    
    // Convert to array format for charts
    const dailySubmissions = Object.keys(submissionsByDate).map(date => ({
      date,
      count: submissionsByDate[date].count,
      approved: submissionsByDate[date].approved,
      rejected: submissionsByDate[date].rejected
    }));
    
    // Calculate device distribution
    const deviceCounts = {};
    
    views.forEach(view => {
      const device = view.device_type || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    
    const deviceTotal = Object.values(deviceCounts).reduce((sum: any, count: any) => sum + count, 0) as number;
    
    const deviceDistribution = Object.keys(deviceCounts).map(device => ({
      device,
      count: deviceCounts[device] as number,
      percentage: deviceTotal > 0 ? (deviceCounts[device] as number) / deviceTotal : 0
    }));
    
    // Calculate form errors by field
    const { data: formErrors, error: errorsError } = await supabase
      .from('form_validation_errors')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (errorsError) {
      console.error('Error fetching form errors:', errorsError);
      throw new Error(errorsError.message);
    }
    
    const errorsByField = {};
    
    formErrors.forEach(error => {
      const fieldName = error.field_name;
      errorsByField[fieldName] = (errorsByField[fieldName] || 0) + 1;
    });
    
    const totalErrors = Object.values(errorsByField).reduce((sum: any, count: any) => sum + count, 0) as number;
    
    const errorData = Object.keys(errorsByField).map(fieldName => ({
      fieldName,
      errorCount: errorsByField[fieldName] as number,
      percentage: totalErrors > 0 ? (errorsByField[fieldName] as number) / totalErrors : 0
    }));
    
    // Calculate time of day distribution
    const hourCounts = {};
    
    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourCounts[hour] = 0;
    }
    
    submissions.forEach(submission => {
      const submissionTime = new Date(submission.created_at);
      const hour = submissionTime.getHours();
      hourCounts[hour]++;
    });
    
    const timeOfDayDistribution = Object.keys(hourCounts).map(hour => ({
      hour: parseInt(hour),
      count: hourCounts[hour]
    }));
    
    // Calculate form step abandonment
    const { data: stepData, error: stepError } = await supabase
      .from('form_step_tracking')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (stepError) {
      console.error('Error fetching step data:', stepError);
      throw new Error(stepError.message);
    }
    
    const stepCounts = {};
    const stepAbandons = {};
    const totalStarts = stepData.filter(step => step.step_name === 'start').length;
    
    stepData.forEach(step => {
      const stepName = step.step_name;
      stepCounts[stepName] = (stepCounts[stepName] || 0) + 1;
    });
    
    let previousCount = totalStarts;
    const steps = ['personal_info', 'contact_details', 'service_selection', 'confirmation'];
    
    steps.forEach(step => {
      const currentCount = stepCounts[step] || 0;
      stepAbandons[step] = previousCount - currentCount;
      previousCount = currentCount;
    });
    
    const formStepAbandonment = steps.map(step => ({
      step,
      abandonCount: stepAbandons[step] || 0,
      percentage: totalStarts > 0 ? (stepAbandons[step] || 0) / totalStarts : 0
    }));
    
    return {
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      conversionRate,
      averageCompletionTime,
      viewsCount,
      abandonmentRate,
      dailySubmissions,
      deviceDistribution,
      errorData,
      timeOfDayDistribution,
      formStepAbandonment
    };
  } catch (error) {
    console.error('Error in fetchFormAnalytics:', error);
    throw error;
  }
  */
  
  // For development, return mock data
  // This is important for initial development until the real data tables are created
  return generateMockAnalyticsData(startDate, endDate);
};

/**
 * Generate mock analytics data for development
 * @param startDate - Start date for mock data
 * @param endDate - End date for mock data
 * @returns - Mock analytics data
 */
const generateMockAnalyticsData = (startDate: string, endDate: string): FormAnalyticsData => {
  // Parse date strings into Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate number of days in range
  const dayDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Generate random total submissions between 100-500
  const totalSubmissions = Math.floor(Math.random() * 400) + 100;
  
  // Distribute between statuses
  const approvedSubmissions = Math.floor(totalSubmissions * (Math.random() * 0.3 + 0.5)); // 50-80% approved
  const rejectedSubmissions = Math.floor(totalSubmissions * (Math.random() * 0.2 + 0.05)); // 5-25% rejected
  const pendingSubmissions = totalSubmissions - approvedSubmissions - rejectedSubmissions;
  
  // Generate random views (greater than submissions)
  const viewsCount = totalSubmissions + Math.floor(Math.random() * 300) + 50;
  
  // Calculate conversion rate
  const conversionRate = totalSubmissions / viewsCount;
  
  // Calculate average completion time
  const averageCompletionTime = Math.floor(Math.random() * 180) + 120;
  
  // Calculate abandonment rate (10-30%)
  const abandonmentRate = Math.random() * 0.2 + 0.1;
  
  // Generate daily submission data
  const dailySubmissions = [];
  let currentDate = new Date(start);
  const submissionsPerDay = Math.ceil(totalSubmissions / dayDiff);
  
  for (let i = 0; i < dayDiff; i++) {
    const dayCount = Math.floor(Math.random() * submissionsPerDay * 1.5) + Math.max(1, submissionsPerDay * 0.5);
    const dayApproved = Math.floor(dayCount * (Math.random() * 0.3 + 0.5));
    const dayRejected = Math.floor(dayCount * (Math.random() * 0.2 + 0.05));
    
    dailySubmissions.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      count: dayCount,
      approved: dayApproved,
      rejected: dayRejected
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Generate device distribution
  const devices = ['Desktop', 'Smartphone', 'Tablet', 'Other'];
  const deviceTotal = viewsCount;
  const deviceDistribution = [];
  
  let remainingPercentage = 1;
  for (let i = 0; i < devices.length - 1; i++) {
    const percentage = i === 0 
      ? Math.random() * 0.3 + 0.4 // Desktop: 40-70%
      : Math.random() * remainingPercentage * 0.8; // Others split remaining
    
    const count = Math.floor(deviceTotal * percentage);
    deviceDistribution.push({
      device: devices[i],
      count,
      percentage
    });
    
    remainingPercentage -= percentage;
  }
  
  // Add the final device with remaining percentage
  deviceDistribution.push({
    device: devices[devices.length - 1],
    count: Math.floor(deviceTotal * remainingPercentage),
    percentage: remainingPercentage
  });
  
  // Generate error data
  const errorFields = [
    'Όνομα', 'Επώνυμο', 'Email', 'Τηλέφωνο', 'ΑΦΜ', 
    'Διεύθυνση', 'Ταχ. Κώδικας', 'Υπηρεσία', 'Ποσότητα'
  ];
  
  const totalErrors = Math.floor(viewsCount * 0.3); // 30% of views have errors
  const errorData = [];
  
  let remainingErrors = totalErrors;
  for (let i = 0; i < errorFields.length - 1; i++) {
    // More errors for important fields
    const errorWeight = i < 4 ? 0.3 : 0.1;
    const errorCount = Math.floor(remainingErrors * errorWeight * (Math.random() + 0.5));
    
    errorData.push({
      fieldName: errorFields[i],
      errorCount,
      percentage: errorCount / totalErrors
    });
    
    remainingErrors -= errorCount;
  }
  
  // Add the final field with remaining errors
  errorData.push({
    fieldName: errorFields[errorFields.length - 1],
    errorCount: remainingErrors,
    percentage: remainingErrors / totalErrors
  });
  
  // Sort by error count descending
  errorData.sort((a, b) => b.errorCount - a.errorCount);
  
  // Generate time of day distribution
  const timeOfDayDistribution = [];
  
  for (let hour = 0; hour < 24; hour++) {
    // More submissions during work hours
    const hourWeight = (hour >= 9 && hour <= 18) ? 3 : 1;
    const count = Math.floor(Math.random() * hourWeight * totalSubmissions / 24);
    
    timeOfDayDistribution.push({
      hour,
      count
    });
  }
  
  // Calculate form step abandonment
  const steps = ['Προσωπικά Στοιχεία', 'Στοιχεία Επικοινωνίας', 'Επιλογή Υπηρεσίας', 'Επιβεβαίωση'];
  const formStarts = Math.floor(viewsCount * 0.8); // 80% of views start the form
  const formStepAbandonment = [];
  
  let remainingStarts = formStarts;
  let cumulativeAbandonRate = 0;
  
  for (let i = 0; i < steps.length; i++) {
    const stepWeight = i === 0 ? 0.05 : i === 1 ? 0.1 : i === 2 ? 0.15 : 0.05;
    const abandonRate = Math.random() * stepWeight + (stepWeight / 2);
    const abandonCount = Math.floor(remainingStarts * abandonRate);
    
    cumulativeAbandonRate += abandonRate;
    
    formStepAbandonment.push({
      step: steps[i],
      abandonCount,
      percentage: abandonRate
    });
    
    remainingStarts -= abandonCount;
  }
  
  return {
    totalSubmissions,
    pendingSubmissions,
    approvedSubmissions,
    rejectedSubmissions,
    conversionRate,
    averageCompletionTime,
    viewsCount,
    abandonmentRate,
    dailySubmissions,
    deviceDistribution,
    errorData,
    timeOfDayDistribution,
    formStepAbandonment
  };
};

/**
 * Fetch form error analytics data based on date range
 * @param params - Start and end date for analytics
 * @returns - Promise with error analytics data
 */
export const fetchFormErrorAnalytics = async (params: AnalyticsParams): Promise<any> => {
  const { startDate, endDate } = params;
  
  // For production, uncomment this code to fetch real data
  /*
  try {
    // Fetch form errors within the date range
    const { data: errorLogs, error: logsError } = await supabase
      .from('form_error_logs')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (logsError) {
      console.error('Error fetching form errors:', logsError);
      throw new Error(logsError.message);
    }
    
    // Fetch form views for error rate calculation
    const { data: views, error: viewsError } = await supabase
      .from('form_view_logs')
      .select('*')
      .gte('viewed_at', startDate)
      .lte('viewed_at', endDate);
    
    if (viewsError) {
      console.error('Error fetching form views:', viewsError);
      throw new Error(viewsError.message);
    }
    
    // Total errors
    const totalErrors = errorLogs.length;
    
    // Count errors by type
    const errorsByType: Record<string, number> = {};
    errorLogs.forEach((log: any) => {
      const errorType = log.error_type || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });
    
    // Count errors by severity
    const errorSeverityDistribution: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    errorLogs.forEach((log: any) => {
      const severity = log.severity || 'low';
      errorSeverityDistribution[severity] = (errorSeverityDistribution[severity] || 0) + 1;
    });
    
    // Calculate error rate
    const viewsCount = views.length;
    const errorRate = viewsCount > 0 ? totalErrors / viewsCount : 0;
    
    // Get most problematic fields
    const fieldErrors: Record<string, number> = {};
    errorLogs.forEach((log: any) => {
      if (log.field_name) {
        fieldErrors[log.field_name] = (fieldErrors[log.field_name] || 0) + 1;
      }
    });
    
    const mostProblematicFields = Object.entries(fieldErrors)
      .map(([fieldName, errorCount]) => ({ fieldName, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);
    
    // Get most common error
    let mostCommonError = { type: '', count: 0 };
    Object.entries(errorsByType).forEach(([type, count]) => {
      if (count > mostCommonError.count) {
        mostCommonError = { type, count };
      }
    });
    
    // Calculate error rate over time
    const errorRateOverTime: { date: string, rate: number }[] = [];
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    let currentDate = startDateObj;
    while (currentDate <= endDateObj) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayErrors = errorLogs.filter((log: any) => 
        format(new Date(log.created_at), 'yyyy-MM-dd') === dateStr
      ).length;
      
      const dayViews = views.filter((view: any) => 
        format(new Date(view.viewed_at), 'yyyy-MM-dd') === dateStr
      ).length;
      
      errorRateOverTime.push({
        date: dateStr,
        rate: dayViews > 0 ? dayErrors / dayViews : 0
      });
      
      currentDate = addDays(currentDate, 1);
    }
    
    // Format recent errors
    const recentErrors = errorLogs
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((log: any) => ({
        errorType: log.error_type,
        errorMessage: log.error_message,
        fieldName: log.field_name,
        severity: log.severity,
        formLinkId: log.form_link_id,
        timestamp: log.created_at,
        metadata: log.metadata
      }));
    
    // Analyze error trends
    // This is a simple implementation - in a real app, you would likely have more sophisticated trend analysis
    const hourAgo = new Date();
    hourAgo.setHours(hourAgo.getHours() - 1);
    
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const errorTrends = Object.keys(errorsByType).map(errorType => {
      const lastHourErrors = errorLogs.filter((log: any) => 
        log.error_type === errorType && 
        new Date(log.created_at) >= hourAgo
      ).length;
      
      const previousHourErrors = errorLogs.filter((log: any) => 
        log.error_type === errorType && 
        new Date(log.created_at) >= twoHoursAgo &&
        new Date(log.created_at) < hourAgo
      ).length;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let percentageChange = 0;
      
      if (previousHourErrors > 0) {
        percentageChange = Math.round(((lastHourErrors - previousHourErrors) / previousHourErrors) * 100);
        
        if (percentageChange > 10) {
          trend = 'increasing';
        } else if (percentageChange < -10) {
          trend = 'decreasing';
        }
      }
      
      return {
        errorType,
        count: lastHourErrors,
        trend,
        percentageChange,
        timeFrame: 'lastHour'
      };
    });
    
    return {
      totalErrors,
      errorsByType,
      errorSeverityDistribution,
      errorRate,
      mostProblematicFields,
      mostCommonError,
      errorRateOverTime,
      recentErrors,
      errorTrends
    };
  }
  catch (error) {
    console.error('Error fetching error analytics:', error);
    throw error;
  }
  */
  
  // For development, return mock data
  return generateMockErrorAnalyticsData(startDate, endDate);
};

/**
 * Generate mock data for error analytics in development
 */
const generateMockErrorAnalyticsData = (startDate: string, endDate: string): any => {
  // Mock total errors
  const totalErrors = 78;
  
  // Mock errors by type
  const errorsByType = {
    validation: 45,
    submission: 18,
    api: 10,
    connectivity: 5
  };
  
  // Mock error severity distribution
  const errorSeverityDistribution = {
    critical: 4,
    high: 12,
    medium: 35,
    low: 27
  };
  
  // Mock error rate
  const errorRate = 0.084; // 8.4%
  
  // Mock most problematic fields
  const mostProblematicFields = [
    { fieldName: 'email', errorCount: 15 },
    { fieldName: 'telephone', errorCount: 12 },
    { fieldName: 'afm', errorCount: 10 },
    { fieldName: 'address', errorCount: 8 },
    { fieldName: 'postalCode', errorCount: 6 },
    { fieldName: 'companyName', errorCount: 4 }
  ];
  
  // Mock most common error
  const mostCommonError = {
    type: 'validation',
    count: 45
  };
  
  // Mock error rate over time
  const startDateObj = parse(startDate, 'yyyy-MM-dd', new Date());
  const endDateObj = parse(endDate, 'yyyy-MM-dd', new Date());
  const daysCount = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const errorRateOverTime = Array.from({ length: daysCount }, (_, i) => {
    const currentDate = addDays(startDateObj, i);
    return {
      date: format(currentDate, 'yyyy-MM-dd'),
      rate: 0.05 + Math.random() * 0.1 // Random rate between 5% and 15%
    };
  });
  
  // Mock recent errors
  const severities = ['low', 'medium', 'high', 'critical'];
  const errorTypes = ['validation', 'submission', 'api', 'connectivity'];
  const fieldNames = ['email', 'telephone', 'afm', 'address', 'postalCode', 'companyName', null];
  const errorMessages = [
    'Μη έγκυρη διεύθυνση email',
    'Το τηλέφωνο πρέπει να έχει τουλάχιστον 10 ψηφία',
    'Μη έγκυρο ΑΦΜ',
    'Σφάλμα αποθήκευσης δεδομένων',
    'Σφάλμα σύνδεσης με τον διακομιστή',
    'Υποχρεωτικό πεδίο'
  ];
  
  const recentErrors = Array.from({ length: 10 }, (_, i) => {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - i * 30);
    
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const fieldName = fieldNames[Math.floor(Math.random() * fieldNames.length)];
    const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    
    return {
      errorType,
      severity,
      fieldName,
      errorMessage,
      formLinkId: `form-${Math.floor(Math.random() * 1000)}`,
      timestamp: timestamp.toISOString(),
      metadata: {
        occurrenceCount: Math.floor(Math.random() * 5) + 1
      }
    };
  });
  
  // Mock error trends
  const errorTrends = [
    {
      errorType: 'validation',
      count: 12,
      trend: 'increasing',
      percentageChange: 20,
      timeFrame: 'lastHour'
    },
    {
      errorType: 'submission',
      count: 5,
      trend: 'decreasing',
      percentageChange: -15,
      timeFrame: 'lastHour'
    },
    {
      errorType: 'api',
      count: 2,
      trend: 'stable',
      percentageChange: 0,
      timeFrame: 'lastHour'
    },
    {
      errorType: 'connectivity',
      count: 1,
      trend: 'decreasing',
      percentageChange: -50,
      timeFrame: 'lastHour'
    }
  ];
  
  return {
    totalErrors,
    errorsByType,
    errorSeverityDistribution,
    errorRate,
    mostProblematicFields,
    mostCommonError,
    errorRateOverTime,
    recentErrors,
    errorTrends
  };
};

/**
 * Fetch customer segment analytics data based on date range
 * @param params - Start and end date for analytics
 * @returns - Promise with segment analytics data
 */
export const fetchCustomerSegmentAnalytics = async (params: AnalyticsParams): Promise<any> => {
  const { startDate, endDate } = params;
  
  // For production, uncomment this code to fetch real data
  /*
  try {
    // Fetch form submissions within the date range with customer data
    const { data: submissions, error: submissionsError } = await supabase
      .from('customer_form_links')
      .select(`
        *,
        customers:customer_id (
          id,
          company_name,
          customer_type,
          town,
          postal_code
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('is_deleted', false);
    
    if (submissionsError) {
      console.error('Error fetching form submissions with customer data:', submissionsError);
      throw new Error(submissionsError.message);
    }
    
    // Fetch form tracking data with device and browser info
    const { data: trackingData, error: trackingError } = await supabase
      .from('form_tracking')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (trackingError) {
      console.error('Error fetching form tracking data:', trackingError);
      throw new Error(trackingError.message);
    }
    
    // Process data by customer type
    const customerTypes = {};
    const geographicalRegions = {};
    const deviceData = [];
    const timeOfDayByType = {};
    const completionTimes = {};
    
    // Initialize all hours
    const hourCounts = {};
    for (let hour = 0; hour < 24; hour++) {
      hourCounts[hour] = {
        count: 0,
        customerTypes: {}
      };
    }
    
    // Process all submissions
    submissions.forEach(submission => {
      const customerType = submission.customers?.customer_type || 'Άγνωστος';
      const region = submission.customers?.town || 'Άγνωστη Περιοχή';
      const submissionTime = new Date(submission.created_at);
      const hour = submissionTime.getHours();
      
      // Process customer type data
      if (!customerTypes[customerType]) {
        customerTypes[customerType] = {
          count: 0,
          completionTimes: [],
          views: 0
        };
      }
      customerTypes[customerType].count++;
      
      // Calculate completion time if available
      if (submission.submitted_at && submission.created_at) {
        const startTime = new Date(submission.created_at).getTime();
        const endTime = new Date(submission.submitted_at).getTime();
        const completionTime = (endTime - startTime) / 1000; // in seconds
        
        if (completionTime > 0) {
          customerTypes[customerType].completionTimes.push(completionTime);
          
          if (!completionTimes[customerType]) {
            completionTimes[customerType] = [];
          }
          completionTimes[customerType].push(completionTime);
        }
      }
      
      // Process geographical data
      if (!geographicalRegions[region]) {
        geographicalRegions[region] = 0;
      }
      geographicalRegions[region]++;
      
      // Process time of day data
      hourCounts[hour].count++;
      
      if (!hourCounts[hour].customerTypes[customerType]) {
        hourCounts[hour].customerTypes[customerType] = 0;
      }
      hourCounts[hour].customerTypes[customerType]++;
    });
    
    // Process view data from tracking
    trackingData.forEach(tracking => {
      if (tracking.interaction_type === 'view' && tracking.form_link_id) {
        // Find related submission to get customer type
        const relatedSubmission = submissions.find(sub => sub.id === tracking.form_link_id);
        if (relatedSubmission && relatedSubmission.customers) {
          const customerType = relatedSubmission.customers.customer_type || 'Άγνωστος';
          
          if (customerTypes[customerType]) {
            customerTypes[customerType].views++;
          }
        }
        
        // Add device and browser data
        if (tracking.device_info) {
          const deviceType = tracking.device_info.deviceType || 'Unknown';
          const browser = tracking.device_info.browser || 'Unknown';
          
          deviceData.push({
            deviceType,
            browser,
            formLinkId: tracking.form_link_id,
            timestamp: tracking.created_at
          });
        }
      }
    });
    
    // Calculate customer type metrics
    const customerTypeData = Object.keys(customerTypes).map(type => {
      const data = customerTypes[type];
      const conversionRate = data.views > 0 ? data.count / data.views : 0;
      
      let avgCompletionTime = 0;
      if (data.completionTimes.length > 0) {
        avgCompletionTime = data.completionTimes.reduce((sum, time) => sum + time, 0) / data.completionTimes.length;
      }
      
      return {
        type,
        count: data.count,
        percentage: submissions.length > 0 ? data.count / submissions.length : 0,
        conversionRate,
        avgCompletionTime
      };
    });
    
    // Calculate geographical metrics
    const geographicalData = Object.keys(geographicalRegions).map(region => ({
      region,
      count: geographicalRegions[region],
      percentage: submissions.length > 0 ? geographicalRegions[region] / submissions.length : 0
    })).sort((a, b) => b.count - a.count);
    
    // Process device data
    const processedDeviceData = deviceData.reduce((acc, curr) => {
      const key = `${curr.deviceType}-${curr.browser}`;
      if (!acc[key]) {
        acc[key] = {
          deviceType: curr.deviceType,
          browser: curr.browser,
          count: 0
        };
      }
      acc[key].count++;
      return acc;
    }, {});
    
    const deviceDistribution = Object.values(processedDeviceData).map((item: any) => ({
      ...item,
      percentage: deviceData.length > 0 ? item.count / deviceData.length : 0
    }));
    
    // Process time of day data
    const timeOfDayData = Object.keys(hourCounts).map(hour => {
      const hourData = hourCounts[hour];
      return {
        hour: parseInt(hour),
        count: hourData.count,
        customerTypes: Object.keys(hourData.customerTypes).map(type => ({
          type,
          count: hourData.customerTypes[type]
        }))
      };
    });
    
    // Process completion time data
    const completionTimeData = Object.keys(completionTimes).map(customerType => {
      const times = completionTimes[customerType];
      return {
        customerType,
        avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times)
      };
    });
    
    // Generate comparison data for metrics
    const metrics = [
      { name: 'Συνολικές Υποβολές', key: 'count' },
      { name: 'Ποσοστό Ολοκλήρωσης', key: 'conversionRate' },
      { name: 'Χρόνος Ολοκλήρωσης (δευτ)', key: 'avgCompletionTime' }
    ];
    
    const comparisonData = metrics.map(metric => {
      return {
        metric: metric.name,
        values: customerTypeData.map(type => ({
          segment: type.type,
          value: type[metric.key]
        }))
      };
    });
    
    return {
      customerTypeData,
      geographicalData,
      deviceData: deviceDistribution,
      timeOfDayData,
      completionTimeData,
      comparisonData
    };
  } catch (error) {
    console.error('Error in fetchCustomerSegmentAnalytics:', error);
    throw error;
  }
  */
  
  // For development, return mock data
  return generateMockSegmentAnalyticsData(startDate, endDate);
};

/**
 * Generate mock segment analytics data for development
 * @param startDate - Start date for mock data
 * @param endDate - End date for mock data
 * @returns - Mock segment analytics data
 */
const generateMockSegmentAnalyticsData = (startDate: string, endDate: string): any => {
  // Customer types to mock
  const customerTypes = ["Εταιρεία", "Ιδιώτης", "Δημόσιο", "Οικοδομές", "Εκτακτος Πελάτης"];
  
  // Generate customer type data
  const customerTypeData = customerTypes.map((type, index) => {
    // Higher counts for common types
    const countFactor = index < 2 ? 2 : index === 2 ? 1.5 : 1;
    const count = Math.floor(Math.random() * 50 * countFactor) + 20;
    
    return {
      type,
      count,
      percentage: 0, // Will be calculated below
      conversionRate: Math.random() * 0.4 + 0.4, // 40-80% conversion
      avgCompletionTime: Math.floor(Math.random() * 180) + 60 // 60-240 seconds
    };
  });
  
  // Calculate percentages
  const totalSubmissions = customerTypeData.reduce((sum, data) => sum + data.count, 0);
  customerTypeData.forEach(data => {
    data.percentage = data.count / totalSubmissions;
  });
  
  // Generate geographical data
  const regions = [
    "Αθήνα", "Θεσσαλονίκη", "Πάτρα", "Ηράκλειο", "Λάρισα",
    "Βόλος", "Ιωάννινα", "Χανιά", "Καβάλα", "Σέρρες", "Άλλες Περιοχές"
  ];
  
  const geographicalData = regions.map((region, index) => {
    // More entries from larger cities
    const countFactor = index < 3 ? 3 : index < 6 ? 2 : 1;
    const count = Math.floor(Math.random() * 30 * countFactor) + 5;
    
    return {
      region,
      count,
      percentage: 0 // Will be calculated below
    };
  });
  
  // Calculate percentages
  const totalGeo = geographicalData.reduce((sum, data) => sum + data.count, 0);
  geographicalData.forEach(data => {
    data.percentage = data.count / totalGeo;
  });
  
  // Sort by count descending
  geographicalData.sort((a, b) => b.count - a.count);
  
  // Generate device data
  const deviceTypes = ["Desktop", "Mobile", "Tablet"];
  const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera", "Other"];
  
  const deviceData = [];
  
  deviceTypes.forEach(deviceType => {
    browsers.forEach(browser => {
      // Not all combinations are equally likely
      if (Math.random() > 0.3 || 
         (deviceType === "Desktop" && browser === "Safari") ||
         (deviceType === "Mobile" && browser === "Edge")) {
        const count = Math.floor(Math.random() * 30) + 5;
        deviceData.push({
          deviceType,
          browser,
          count,
          percentage: 0 // Will be calculated below
        });
      }
    });
  });
  
  // Calculate percentages
  const totalDevices = deviceData.reduce((sum, data) => sum + data.count, 0);
  deviceData.forEach(data => {
    data.percentage = data.count / totalDevices;
  });
  
  // Generate time of day data
  const timeOfDayData = [];
  
  for (let hour = 0; hour < 24; hour++) {
    // More submissions during work hours
    const hourWeight = (hour >= 9 && hour <= 18) ? 3 : 1;
    const count = Math.floor(Math.random() * hourWeight * 5) + 1;
    
    // Generate customer type breakdown for each hour
    const customerTypesForHour = customerTypes.map(type => {
      // Distribute the count among customer types
      return {
        type,
        count: Math.floor(Math.random() * count * 0.8) + 1
      };
    });
    
    timeOfDayData.push({
      hour,
      count,
      customerTypes: customerTypesForHour
    });
  }
  
  // Generate completion time data
  const completionTimeData = customerTypes.map(type => {
    const avgTime = Math.floor(Math.random() * 180) + 60; // 60-240 seconds
    return {
      customerType: type,
      avgTime,
      minTime: Math.max(avgTime - Math.floor(Math.random() * 40), 30), // Min at least 30 seconds
      maxTime: avgTime + Math.floor(Math.random() * 120) // Max up to 2 minutes more
    };
  });
  
  // Generate comparison data
  const comparisonData = [
    {
      metric: "Συνολικές Υποβολές",
      values: customerTypeData.map(type => ({
        segment: type.type,
        value: type.count
      }))
    },
    {
      metric: "Ποσοστό Ολοκλήρωσης",
      values: customerTypeData.map(type => ({
        segment: type.type,
        value: type.conversionRate
      }))
    },
    {
      metric: "Χρόνος Ολοκλήρωσης (δευτ)",
      values: customerTypeData.map(type => ({
        segment: type.type,
        value: type.avgCompletionTime
      }))
    }
  ];
  
  return {
    customerTypeData,
    geographicalData,
    deviceData,
    timeOfDayData,
    completionTimeData,
    comparisonData
  };
}; 