/**
 * Frontend Performance Monitoring Service
 * 
 * This service provides functionality to monitor frontend performance metrics,
 * track page load times, component rendering, network requests,
 * user interactions, and form submission timing.
 */

import { createClient } from '@supabase/supabase-js';
import React from 'react';
import { supabase } from '@/lib/supabaseClient';

// Types for frontend performance monitoring
export interface PageLoadMetrics {
  route: string;
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
  largestContentfulPaint?: number;
  timestamp: string;
  userId?: string;
  userAgent?: string;
  connection?: string;
  deviceMemory?: number;
  effectiveConnectionType?: string;
}

export interface ComponentRenderMetrics {
  componentName: string;
  route: string;
  renderTime: number;
  rerenders: number;
  timestamp: string;
  userId?: string;
}

export interface NetworkRequestMetrics {
  url: string;
  route: string;
  method: string;
  duration: number;
  status: number;
  requestSize?: number;
  responseSize?: number;
  resourceType?: string; // 'xhr', 'fetch', 'script', 'css', 'image', etc.
  cached: boolean;
  timestamp: string;
  userId?: string;
}

export interface UserInteractionMetrics {
  route: string;
  eventType: string;
  targetElement: string;
  duration: number;
  timestamp: string;
  userId?: string;
}

export interface FormSubmissionMetrics {
  formId: string;
  route: string;
  preparationTime: number; // Time spent filling form
  validationTime: number;  // Time spent validating
  submissionTime: number;  // Time from submit click to response
  totalTime: number;       // Total time from form load to completion
  success: boolean;
  fieldCount: number;
  timestamp: string;
  userId?: string;
}

export interface PerformanceReport {
  avgPageLoadTime: number;
  avgFirstContentfulPaint: number;
  avgTimeToInteractive: number;
  avgNetworkRequestTime: number;
  slowestNetworkRequests: NetworkRequestMetrics[];
  slowestComponents: ComponentRenderMetrics[];
  avgFormSubmissionTime: number;
  avgUserInteractionTime: number;
  performanceScore: number;
}

// Storage keys
const STORAGE_KEYS = {
  PERFORMANCE_BUFFER: 'frontend_performance_buffer',
  LAST_UPLOAD_TIME: 'last_performance_upload',
};

// Configuration
const CONFIG = {
  UPLOAD_INTERVAL: 60 * 1000, // Upload collected metrics every 60 seconds
  BUFFER_SIZE_LIMIT: 50,      // Maximum buffer size before forced upload
  SAMPLE_RATE: 0.1,           // Sample 10% of users for detailed monitoring
};

/**
 * Frontend Performance Monitoring Service for tracking client-side performance
 */
const FrontendPerformanceService = {
  _initialized: false,
  _buffer: [] as any[],
  _isMonitoringEnabled: false,
  _userId: undefined as string | undefined,
  _sessionId: '',

  /**
   * Initializes the performance monitoring service
   * @param userId Optional user ID for tracking
   */
  init(userId?: string): void {
    if (this._initialized) return;
    
    this._initialized = true;
    this._userId = userId;
    this._sessionId = crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}`;
    
    // Check if monitoring should be enabled for this user
    this._isMonitoringEnabled = this._shouldEnableMonitoring();
    
    if (!this._isMonitoringEnabled) return;
    
    // Load buffer from sessionStorage if exists
    this._loadBuffer();
    
    // Setup periodic upload
    this._setupPeriodicUpload();
    
    // Capture initial page load metrics
    this._capturePageLoadMetrics();
    
    // Monkey patch fetch for network request monitoring
    this._monitorNetworkRequests();
    
    // Listen for beforeunload to save buffer
    this._setupBeforeUnloadHandler();
    
    console.log('Frontend performance monitoring initialized');
  },

  /**
   * Determines if monitoring should be enabled based on sampling rate
   */
  _shouldEnableMonitoring(): boolean {
    // Always enable in development
    if (process.env.NODE_ENV === 'development') return true;
    
    // Check if user has opted out of analytics
    if (navigator.doNotTrack === '1') return false;
    
    // Use sampling for production to reduce overhead
    if (process.env.NODE_ENV === 'production') {
      return Math.random() < CONFIG.SAMPLE_RATE;
    }
    
    return true;
  },

  /**
   * Loads the metrics buffer from sessionStorage
   */
  _loadBuffer(): void {
    try {
      const storedBuffer = sessionStorage.getItem(STORAGE_KEYS.PERFORMANCE_BUFFER);
      if (storedBuffer) {
        this._buffer = JSON.parse(storedBuffer);
      }
    } catch (err) {
      console.error('Error loading performance buffer:', err);
      this._buffer = [];
    }
  },

  /**
   * Saves the metrics buffer to sessionStorage
   */
  _saveBuffer(): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.PERFORMANCE_BUFFER, JSON.stringify(this._buffer));
    } catch (err) {
      console.error('Error saving performance buffer:', err);
    }
  },

  /**
   * Sets up periodic upload of metrics
   */
  _setupPeriodicUpload(): void {
    setInterval(() => this.uploadMetrics(), CONFIG.UPLOAD_INTERVAL);
  },

  /**
   * Sets up handler to save buffer before page unload
   */
  _setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      if (this._buffer.length > 0) {
        // Use sendBeacon API for reliable delivery during page unload
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify({
            metrics: this._buffer,
            sessionId: this._sessionId
          })], { type: 'application/json' });
          
          navigator.sendBeacon('/api/monitoring/performance', blob);
          this._buffer = [];
          this._saveBuffer();
        } else {
          // Fallback to sync XHR
          this.uploadMetrics(true);
        }
      }
    });
  },

  /**
   * Captures page load performance metrics
   */
  _capturePageLoadMetrics(): void {
    if (!this._isMonitoringEnabled || typeof window === 'undefined') return;
    
    // Wait for page to fully load
    window.addEventListener('load', () => {
      // Use setTimeout to ensure metrics are available
      setTimeout(() => {
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
        const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
        
        // LCP may not be available without PerformanceObserver
        let largestContentfulPaint;
        try {
          const lcpEntry = performance.getEntriesByType('largest-contentful-paint').pop();
          largestContentfulPaint = lcpEntry ? lcpEntry.startTime : undefined;
        } catch (e) {
          // LCP not supported
        }
        
        // Get connection information
        let connection: any;
        try {
          connection = (navigator as any).connection;
        } catch (e) {
          // Connection API not supported
        }
        
        const metrics: PageLoadMetrics = {
          route: window.location.pathname,
          loadTime: navigationEntry ? navigationEntry.loadEventEnd - navigationEntry.startTime : performance.now(),
          domContentLoaded: navigationEntry ? navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime : 0,
          firstPaint,
          firstContentfulPaint,
          timeToInteractive: this._calculateTimeToInteractive() || 0,
          largestContentfulPaint,
          timestamp: new Date().toISOString(),
          userId: this._userId,
          userAgent: navigator.userAgent,
          connection: connection ? connection.effectiveType : undefined,
          deviceMemory: (navigator as any).deviceMemory,
          effectiveConnectionType: connection ? connection.effectiveType : undefined
        };
        
        this._addToBuffer('page_load', metrics);
        
        // Setup LCP observer for future navigations
        this._observeLargestContentfulPaint();
        
        // Setup TTI observer
        this._observeTimeToInteractive();
        
        // Setup FID (First Input Delay) observer
        this._observeFirstInputDelay();

        // Track first user interaction
        this._trackFirstUserInteraction();
      }, 500); // Wait 500ms to ensure all metrics are available
    });
  },

  /**
   * Calculates Time to Interactive metric
   * This is a simplified calculation as the true TTI is complex
   */
  _calculateTimeToInteractive(): number {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const firstContentfulPaint = performance
        .getEntriesByType('paint')
        .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      // A simple estimation based on DOM interactive and first contentful paint
      if (navigationEntry && firstContentfulPaint) {
        return Math.max(
          navigationEntry.domInteractive,
          firstContentfulPaint + 50 // Add 50ms buffer for user interaction readiness
        );
      }
      return 0;
    } catch (e) {
      console.error('Error calculating TTI:', e);
      return 0;
    }
  },

  /**
   * Observes Largest Contentful Paint for future navigations
   */
  _observeLargestContentfulPaint(): void {
    try {
      if ('PerformanceObserver' in window) {
        let lcpValue = 0;
        
        const lcpObserver = new PerformanceObserver((entries) => {
          const lcpEntries = entries.getEntries();
          if (lcpEntries.length > 0) {
            const lastEntry = lcpEntries[lcpEntries.length - 1];
            lcpValue = lastEntry.startTime;
          }
        });
        
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Update the buffer on page hide
        window.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden' && lcpValue > 0) {
            const metrics = this._buffer.find(item => item.type === 'page_load');
            if (metrics) {
              metrics.data.largestContentfulPaint = lcpValue;
            }
          }
        });
      }
    } catch (e) {
      console.error('Error observing LCP:', e);
    }
  },

  /**
   * Observes Time to Interactive for future navigations
   */
  _observeTimeToInteractive(): void {
    // This is a simplified observation as true TTI requires more complex logic
    try {
      let lastLongTask = 0;
      if ('PerformanceObserver' in window) {
        const ttiObserver = new PerformanceObserver((entries) => {
          const tasks = entries.getEntries();
          if (tasks.length > 0) {
            lastLongTask = tasks[tasks.length - 1].startTime + tasks[tasks.length - 1].duration;
            
            // Update TTI in the buffer
            const metrics = this._buffer.find(item => item.type === 'page_load');
            if (metrics) {
              metrics.data.timeToInteractive = Math.max(
                metrics.data.timeToInteractive || 0,
                lastLongTask + 50 // Add 50ms buffer
              );
            }
          }
        });
        
        ttiObserver.observe({ type: 'longtask', buffered: true });
      }
    } catch (e) {
      console.error('Error observing TTI:', e);
    }
  },

  /**
   * Observes First Input Delay
   */
  _observeFirstInputDelay(): void {
    try {
      if ('PerformanceObserver' in window) {
        let firstInputTime = 0;
        let firstInputDelay = 0;
        
        const fidObserver = new PerformanceObserver((entries) => {
          const firstInput = entries.getEntries()[0];
          if (firstInput) {
            firstInputTime = firstInput.startTime;
            firstInputDelay = (firstInput as any).processingStart - firstInput.startTime;
            
            // Record first input metrics
            this.recordUserInteraction('first-input', 'document', firstInputDelay);
          }
        });
        
        fidObserver.observe({ type: 'first-input', buffered: true });
      }
    } catch (e) {
      console.error('Error observing FID:', e);
    }
  },

  /**
   * Tracks first user interaction with the page
   */
  _trackFirstUserInteraction(): void {
    // Already tracking via PerformanceObserver, but this adds a fallback
    // and captures more context about the interaction
    const interactionEvents = ['mousedown', 'keydown', 'touchstart', 'pointerdown'];
    
    let firstInteractionRecorded = false;
    const handleFirstInteraction = (event: Event) => {
      if (firstInteractionRecorded) return;
      firstInteractionRecorded = true;
      
      // Remove all listeners
      interactionEvents.forEach(eventType => {
        document.removeEventListener(eventType, handleFirstInteraction);
      });
      
      // Get target element information
      const target = event.target as HTMLElement;
      const targetSelector = this._getElementSelector(target);
      
      // Record interaction (0 duration since this is just capturing the event occurrence)
      this.recordUserInteraction('first-interaction', targetSelector, 0);
    };
    
    // Add listeners for all interaction events
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, handleFirstInteraction, { once: false, capture: true });
    });
  },

  /**
   * Gets a CSS selector for an element (simplified)
   */
  _getElementSelector(element: HTMLElement | null): string {
    if (!element) return 'unknown';
    if (element.id) return `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
      return `.${element.className.split(' ')[0]}`;
    }
    return element.tagName.toLowerCase();
  },

  /**
   * Monitors network requests by patching fetch and XHR
   */
  _monitorNetworkRequests(): void {
    if (!this._isMonitoringEnabled || typeof window === 'undefined') return;
    
    // Patch fetch API
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      let url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = args[1]?.method || 'GET';
      let requestSize = 0;
      let responseSize = 0;
      
      try {
        if (args[1]?.body) {
          requestSize = new Blob([args[1].body.toString()]).size;
        }
        
        const response = await originalFetch.apply(window, args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Clone the response to get its size without consuming it
        const clonedResponse = response.clone();
        const responseText = await clonedResponse.text();
        responseSize = new Blob([responseText]).size;
        
        this._recordNetworkRequest({
          url,
          route: window.location.pathname,
          method,
          duration,
          status: response.status,
          requestSize,
          responseSize,
          resourceType: 'fetch',
          cached: response.headers.get('x-cache') === 'HIT',
          timestamp: new Date().toISOString(),
          userId: this._userId
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this._recordNetworkRequest({
          url,
          route: window.location.pathname,
          method,
          duration,
          status: 0, // Error
          requestSize,
          responseSize: 0,
          resourceType: 'fetch',
          cached: false,
          timestamp: new Date().toISOString(),
          userId: this._userId
        });
        
        throw error;
      }
    };
    
    // Patch XMLHttpRequest
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(...args) {
      this._monitoringData = {
        method: args[0],
        url: args[1],
        startTime: 0,
        requestSize: 0
      };
      return originalXhrOpen.apply(this, args);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
      if (this._monitoringData) {
        this._monitoringData.startTime = performance.now();
        if (body) {
          this._monitoringData.requestSize = new Blob([body.toString()]).size;
        }
        
        this.addEventListener('load', () => {
          const endTime = performance.now();
          const duration = endTime - this._monitoringData.startTime;
          
          // Estimate response size from response headers
          let responseSize = 0;
          const contentLength = this.getResponseHeader('Content-Length');
          if (contentLength) {
            responseSize = parseInt(contentLength, 10);
          } else if (this.responseText) {
            responseSize = new Blob([this.responseText]).size;
          }
          
          FrontendPerformanceService._recordNetworkRequest({
            url: this._monitoringData.url,
            route: window.location.pathname,
            method: this._monitoringData.method,
            duration,
            status: this.status,
            requestSize: this._monitoringData.requestSize,
            responseSize,
            resourceType: 'xhr',
            cached: this.getResponseHeader('x-cache') === 'HIT',
            timestamp: new Date().toISOString(),
            userId: FrontendPerformanceService._userId
          });
        });
        
        this.addEventListener('error', () => {
          const endTime = performance.now();
          const duration = endTime - this._monitoringData.startTime;
          
          FrontendPerformanceService._recordNetworkRequest({
            url: this._monitoringData.url,
            route: window.location.pathname,
            method: this._monitoringData.method,
            duration,
            status: 0, // Error
            requestSize: this._monitoringData.requestSize,
            responseSize: 0,
            resourceType: 'xhr',
            cached: false,
            timestamp: new Date().toISOString(),
            userId: FrontendPerformanceService._userId
          });
        });
      }
      
      return originalXhrSend.apply(this, arguments);
    };
    
    // Process resource timing entries
    const processResourceEntries = () => {
      const resourceEntries = performance.getEntriesByType('resource');
      
      resourceEntries.forEach(entry => {
        const url = entry.name;
        // Skip entries for the monitoring API itself to avoid infinite loops
        if (url.includes('/api/monitoring')) return;
        
        // Skip entries we've already processed
        if (this._processedResources && this._processedResources.has(entry.startTime + '-' + url)) {
          return;
        }
        
        // Mark as processed
        if (!this._processedResources) this._processedResources = new Set();
        this._processedResources.add(entry.startTime + '-' + url);
        
        // Only process resources that aren't already tracked by fetch/XHR patches
        if (
          entry.initiatorType !== 'fetch' && 
          entry.initiatorType !== 'xmlhttprequest'
        ) {
          this._recordNetworkRequest({
            url,
            route: window.location.pathname,
            method: 'GET', // Assume GET for resource loads
            duration: entry.duration,
            status: 200, // Assume success for resources that loaded
            requestSize: undefined,
            responseSize: entry.transferSize || entry.encodedBodySize,
            resourceType: this._getResourceTypeFromName(entry.name, entry.initiatorType),
            cached: entry.transferSize === 0 && entry.encodedBodySize > 0,
            timestamp: new Date().toISOString(),
            userId: this._userId
          });
        }
      });
    };
    
    // Process initially and setup observer for future resources
    processResourceEntries();
    
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        processResourceEntries();
      });
      
      observer.observe({ type: 'resource', buffered: true });
    } else {
      // Fallback: periodically check for new resources
      setInterval(processResourceEntries, 3000);
    }
  },
  
  /**
   * Identifies resource type from URL and initiator
   */
  _getResourceTypeFromName(name: string, initiatorType: string = ''): string {
    if (initiatorType && initiatorType !== 'other') return initiatorType;
    
    const url = name.toLowerCase();
    if (url.endsWith('.js')) return 'script';
    if (url.endsWith('.css')) return 'style';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf|eot)$/)) return 'font';
    if (url.match(/\.(mp4|webm|ogv)$/)) return 'video';
    if (url.match(/\.(mp3|ogg|wav)$/)) return 'audio';
    if (url.includes('/api/') || url.includes('/graphql')) return 'api';
    
    // Default to XHR for unknown types
    return 'other';
  },

  /**
   * Records a network request to the buffer
   */
  _recordNetworkRequest(metrics: NetworkRequestMetrics): void {
    this._addToBuffer('network_request', metrics);
  },

  /**
   * Adds an item to the metrics buffer
   */
  _addToBuffer(type: string, data: any): void {
    if (!this._isMonitoringEnabled) return;
    
    this._buffer.push({
      type,
      data,
      sessionId: this._sessionId,
      timestamp: new Date().toISOString()
    });
    
    // Save buffer to storage
    this._saveBuffer();
    
    // If buffer gets too large, upload it
    if (this._buffer.length >= CONFIG.BUFFER_SIZE_LIMIT) {
      this.uploadMetrics();
    }
  },

  /**
   * Records component render time
   */
  recordComponentRender(componentName: string, renderTime: number, rerenders: number = 0): void {
    if (!this._isMonitoringEnabled) return;
    
    const metrics: ComponentRenderMetrics = {
      componentName,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      renderTime,
      rerenders,
      timestamp: new Date().toISOString(),
      userId: this._userId
    };
    
    this._addToBuffer('component_render', metrics);
  },

  /**
   * Records user interaction
   */
  recordUserInteraction(eventType: string, targetElement: string, duration: number): void {
    if (!this._isMonitoringEnabled) return;
    
    const metrics: UserInteractionMetrics = {
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      eventType,
      targetElement,
      duration,
      timestamp: new Date().toISOString(),
      userId: this._userId
    };
    
    this._addToBuffer('user_interaction', metrics);
  },

  /**
   * Records form submission metrics
   */
  recordFormSubmission(formId: string, metrics: Omit<FormSubmissionMetrics, 'formId' | 'route' | 'timestamp' | 'userId'>): void {
    if (!this._isMonitoringEnabled) return;
    
    const fullMetrics: FormSubmissionMetrics = {
      ...metrics,
      formId,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      timestamp: new Date().toISOString(),
      userId: this._userId
    };
    
    this._addToBuffer('form_submission', fullMetrics);
  },

  /**
   * Uploads metrics to the server
   */
  async uploadMetrics(isSync: boolean = false): Promise<boolean> {
    if (!this._isMonitoringEnabled || this._buffer.length === 0) return true;
    
    try {
      // Create a copy of the buffer for uploading
      const bufferToUpload = [...this._buffer];
      
      // Clear buffer before upload to prevent duplicates
      this._buffer = [];
      this._saveBuffer();
      
      // Save last upload time
      sessionStorage.setItem(
        STORAGE_KEYS.LAST_UPLOAD_TIME, 
        new Date().toISOString()
      );
      
      // Send metrics to server
      const ajaxOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics: bufferToUpload,
          sessionId: this._sessionId
        }),
        // For sync requests during page unload (not recommended but sometimes necessary)
        ...(isSync && { keepalive: true })
      };
      
      if (isSync) {
        // Synchronous request for beforeunload
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/monitoring/performance', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
          metrics: bufferToUpload,
          sessionId: this._sessionId
        }));
        return xhr.status >= 200 && xhr.status < 300;
      } else {
        // Asynchronous request
        const response = await fetch('/api/monitoring/performance', ajaxOptions);
        return response.ok;
      }
    } catch (error) {
      console.error('Error uploading performance metrics:', error);
      
      // Restore metrics to buffer if upload failed
      // (but avoid potential infinite growth by merging with time-based deduplication)
      this._buffer = this._buffer.concat(
        this._buffer.length > 0 ? 
          this._buffer.filter(existingItem => 
            !this._buffer.some(item => 
              item.type === existingItem.type && 
              item.data.timestamp === existingItem.data.timestamp
            )
          ) : 
          this._buffer
      );
      
      this._saveBuffer();
      return false;
    }
  },

  /**
   * Gets a performance report for the specified time range
   */
  async getPerformanceReport(
    timeRange: { from: string; to: string }
  ): Promise<PerformanceReport | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_frontend_performance_report', {
          from_time: timeRange.from,
          to_time: timeRange.to
        });
      
      if (error) {
        console.error('Error fetching performance report:', error);
        return null;
      }
      
      if (!data) {
        return {
          avgPageLoadTime: 0,
          avgFirstContentfulPaint: 0,
          avgTimeToInteractive: 0,
          avgNetworkRequestTime: 0,
          slowestNetworkRequests: [],
          slowestComponents: [],
          avgFormSubmissionTime: 0,
          avgUserInteractionTime: 0,
          performanceScore: 0
        };
      }
      
      // Calculate performance score based on metrics
      const performanceScore = this._calculatePerformanceScore(data);
      
      return {
        ...data,
        performanceScore
      };
    } catch (error) {
      console.error('Error getting performance report:', error);
      return null;
    }
  },

  /**
   * Calculates performance score based on weighted metrics
   * Formula is based on common performance metrics importance
   */
  _calculatePerformanceScore(data: any): number {
    // Ideal thresholds (in ms)
    const thresholds = {
      avgPageLoadTime: { good: 1000, poor: 3000 },
      avgFirstContentfulPaint: { good: 1800, poor: 3000 },
      avgTimeToInteractive: { good: 3800, poor: 7300 },
      avgNetworkRequestTime: { good: 500, poor: 2000 },
      avgFormSubmissionTime: { good: 2000, poor: 5000 },
      avgUserInteractionTime: { good: 100, poor: 300 }
    };
    
    // Weights for each metric (sum = 100)
    const weights = {
      avgPageLoadTime: 20,
      avgFirstContentfulPaint: 25,
      avgTimeToInteractive: 25,
      avgNetworkRequestTime: 15,
      avgFormSubmissionTime: 10,
      avgUserInteractionTime: 5
    };
    
    // Calculate score for each metric (0-100)
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [metric, weight] of Object.entries(weights)) {
      const value = data[metric] as number;
      
      // Skip metrics with no data
      if (!value) continue;
      
      const threshold = thresholds[metric as keyof typeof thresholds];
      let score;
      
      // Linear scale between thresholds
      if (value <= threshold.good) {
        // Better than good threshold, score 100
        score = 100;
      } else if (value >= threshold.poor) {
        // Worse than poor threshold, score 0
        score = 0;
      } else {
        // Linear interpolation between good and poor
        score = 100 - (((value - threshold.good) / (threshold.poor - threshold.good)) * 100);
      }
      
      totalScore += score * weight;
      totalWeight += weight;
    }
    
    // Return weighted average, or 0 if no metrics available
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  },

  /**
   * Creates a higher-order component wrapper for tracking component render time
   * This method is designed to be used with React components
   * @param componentName Name of the component to track
   * @returns HOC wrapper function
   */
  withRenderTracking<P>(componentName: string) {
    return (Component: React.ComponentType<P>) => {
      return class WithRenderTracking extends React.Component<P> {
        private rerenders = 0;
        private startTime = 0;

        componentWillMount() {
          this.startTime = performance.now();
        }

        componentDidMount() {
          const renderTime = performance.now() - this.startTime;
          FrontendPerformanceService.recordComponentRender(componentName, renderTime, this.rerenders);
        }

        componentWillUpdate() {
          this.startTime = performance.now();
          this.rerenders++;
        }

        componentDidUpdate() {
          const renderTime = performance.now() - this.startTime;
          FrontendPerformanceService.recordComponentRender(componentName, renderTime, this.rerenders);
        }

        render() {
          return React.createElement(Component, this.props);
        }
      };
    };
  },

  /**
   * Sets up the required database schema for frontend performance monitoring
   */
  async setupFrontendMonitoringSchema(): Promise<boolean> {
    try {
      // Create frontend_performance_logs table if it doesn't exist
      const { error: createTableError } = await supabase.rpc('setup_frontend_performance_schema');
      
      if (createTableError) {
        console.error('Error setting up frontend performance schema:', createTableError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception setting up frontend performance schema:', error);
      return false;
    }
  },

  /**
   * Gets detailed performance metrics for a specific page
   */
  async getPagePerformanceMetrics(
    pagePath: string,
    timeRange: { from: string; to: string }
  ): Promise<{
    pageLoads: PageLoadMetrics[];
    networkRequests: NetworkRequestMetrics[];
    componentRenders: ComponentRenderMetrics[];
    userInteractions: UserInteractionMetrics[];
    formSubmissions: FormSubmissionMetrics[];
  } | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_page_performance_metrics', {
          page_path: pagePath,
          from_time: timeRange.from,
          to_time: timeRange.to
        });
      
      if (error) {
        console.error('Error fetching page performance metrics:', error);
        return null;
      }
      
      return data || {
        pageLoads: [],
        networkRequests: [],
        componentRenders: [],
        userInteractions: [],
        formSubmissions: []
      };
    } catch (error) {
      console.error('Error getting page performance metrics:', error);
      return null;
    }
  }
};

// Initialize as a singleton
export default FrontendPerformanceService; 