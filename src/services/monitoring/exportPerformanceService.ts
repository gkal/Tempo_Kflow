/**
 * Export Performance Service
 * 
 * Provides utility functions for exporting performance data to CSV format
 * for further analysis or reporting purposes.
 */

/**
 * Convert JSON data to CSV format
 * @param data Array of objects to convert to CSV
 * @param columns Optional column definitions with headers
 * @returns CSV formatted string
 */
export const convertToCSV = <T extends Record<string, any>>(
  data: T[],
  columns?: { key: keyof T; header: string }[]
): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // If columns aren't provided, use the keys from the first object
  const columnDefs = columns || Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    header: key as string
  }));

  // Create CSV header row
  const header = columnDefs.map(col => `"${col.header}"`).join(',');

  // Create CSV data rows
  const rows = data.map(item => {
    return columnDefs.map(col => {
      const value = item[col.key];
      
      // Handle different data types appropriately for CSV
      if (value === null || value === undefined) {
        return '""';
      } else if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      } else {
        return `"${String(value).replace(/"/g, '""')}"`;
      }
    }).join(',');
  }).join('\n');

  return `${header}\n${rows}`;
};

/**
 * Download a string as a file
 * @param content Content to download
 * @param filename Name of the file
 * @param contentType Content type (defaults to text/csv)
 */
export const downloadFile = (
  content: string,
  filename: string,
  contentType: string = 'text/csv;charset=utf-8;'
): void => {
  // Create a blob with the content
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.click();
  
  // Clean up
  URL.revokeObjectURL(url);
};

/**
 * Export performance data to CSV
 * @param data Array of objects to export
 * @param filename Name of the file without extension
 * @param columns Optional column definitions with headers
 */
export const exportPerformanceDataToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  // Add timestamp to filename for uniqueness
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fullFilename = `${filename}_${timestamp}.csv`;
  
  // Convert data to CSV and download
  const csvContent = convertToCSV(data, columns);
  downloadFile(csvContent, fullFilename);
};

/**
 * Format API performance data for export
 * @param apiData API performance data
 * @returns Formatted data ready for CSV export
 */
export const formatApiPerformanceForExport = (apiData: any[]): any[] => {
  return apiData.map(item => ({
    endpoint: item.endpoint,
    method: item.method,
    statusCode: item.statusCode,
    responseTime: item.responseTime,
    timestamp: new Date(item.timestamp).toISOString(),
    userId: item.userId || 'anonymous',
    success: item.statusCode < 400 ? 'true' : 'false',
    ...(item.error && { errorMessage: item.error.message })
  }));
};

/**
 * Format frontend performance data for export
 * @param frontendData Frontend performance data
 * @param type Type of performance data (page_load, component_render, etc.)
 * @returns Formatted data ready for CSV export
 */
export const formatFrontendPerformanceForExport = (frontendData: any[], type: string): any[] => {
  switch (type) {
    case 'page_load':
      return frontendData.map(item => ({
        route: item.data.route,
        loadTime: item.data.loadTime,
        domContentLoaded: item.data.domContentLoaded,
        firstPaint: item.data.firstPaint,
        firstContentfulPaint: item.data.firstContentfulPaint,
        timeToInteractive: item.data.timeToInteractive,
        largestContentfulPaint: item.data.largestContentfulPaint,
        timestamp: new Date(item.timestamp).toISOString(),
        connectionType: item.data.effectiveConnectionType || 'unknown',
        deviceType: getDeviceType(item.data.userAgent)
      }));
      
    case 'component_render':
      return frontendData.map(item => ({
        componentName: item.data.componentName,
        renderTime: item.data.renderTime,
        renderCount: item.data.renderCount,
        rerenders: item.data.rerenders || 0,
        timestamp: new Date(item.timestamp).toISOString()
      }));
      
    case 'form_submission':
      return frontendData.map(item => ({
        formId: item.data.formId,
        preparationTime: item.data.preparationTime,
        validationTime: item.data.validationTime,
        submissionTime: item.data.submissionTime,
        totalTime: item.data.totalTime,
        success: item.data.success ? 'true' : 'false',
        fieldCount: item.data.fieldCount,
        timestamp: new Date(item.timestamp).toISOString()
      }));
      
    case 'network_request':
      return frontendData.map(item => ({
        url: item.data.url,
        method: item.data.method,
        status: item.data.status,
        duration: item.data.duration,
        size: item.data.responseSize,
        cached: item.data.cached ? 'true' : 'false',
        resourceType: item.data.resourceType,
        timestamp: new Date(item.timestamp).toISOString()
      }));
      
    default:
      return frontendData.map(item => ({
        ...item.data,
        timestamp: new Date(item.timestamp).toISOString()
      }));
  }
};

/**
 * Determine device type from user agent string
 * @param userAgent Browser user agent string
 * @returns Device type (Mobile, Tablet, Desktop, Unknown)
 */
const getDeviceType = (userAgent: string): string => {
  if (!userAgent) return 'Unknown';
  
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    return 'Mobile';
  } else if (/iPad|Tablet/i.test(userAgent)) {
    return 'Tablet';
  } else {
    return 'Desktop';
  }
};

export default {
  convertToCSV,
  downloadFile,
  exportPerformanceDataToCSV,
  formatApiPerformanceForExport,
  formatFrontendPerformanceForExport
}; 