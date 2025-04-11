import { useEffect, useRef, useCallback } from 'react';
import FrontendPerformanceService from '@/services/monitoring/frontendPerformanceService';
import React from 'react';

/**
 * Hook to track component render performance
 * @param componentName Name of the component to track
 */
export function useRenderPerformance(componentName: string) {
  const startTimeRef = useRef<number>(0);
  const rendersRef = useRef<number>(0);
  
  useEffect(() => {
    // Record initial render
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;
    
    FrontendPerformanceService.recordComponentRender(
      componentName,
      renderTime,
      rendersRef.current
    );
    
    // Setup for next render
    rendersRef.current++;
    startTimeRef.current = performance.now();
    
    // Cleanup not really needed here
    return () => {};
  }, [componentName]);
  
  // Return nothing as this is just for tracking
  return null;
}

/**
 * Hook to track form performance
 * @param formId Unique identifier for the form
 * @returns Object with tracking methods
 */
export function useFormPerformance(formId: string) {
  const startTimeRef = useRef<number>(0);
  const preparationStartRef = useRef<number>(0);
  const validationStartRef = useRef<number>(0);
  const submissionStartRef = useRef<number>(0);
  const fieldCountRef = useRef<number>(0);
  
  useEffect(() => {
    // Record form load time
    startTimeRef.current = performance.now();
    preparationStartRef.current = performance.now();
    
    return () => {};
  }, [formId]);
  
  // Start tracking form preparation (user filling the form)
  const startPreparation = () => {
    preparationStartRef.current = performance.now();
  };
  
  // Start tracking validation phase
  const startValidation = () => {
    validationStartRef.current = performance.now();
  };
  
  // Start tracking submission phase
  const startSubmission = () => {
    submissionStartRef.current = performance.now();
  };
  
  // Record form field count
  const setFieldCount = (count: number) => {
    fieldCountRef.current = count;
  };
  
  // Record complete form submission
  const recordSubmission = (success: boolean) => {
    const endTime = performance.now();
    
    const preparationTime = validationStartRef.current - preparationStartRef.current;
    const validationTime = submissionStartRef.current - validationStartRef.current;
    const submissionTime = endTime - submissionStartRef.current;
    const totalTime = endTime - startTimeRef.current;
    
    FrontendPerformanceService.recordFormSubmission(formId, {
      preparationTime,
      validationTime,
      submissionTime,
      totalTime,
      success,
      fieldCount: fieldCountRef.current
    });
  };
  
  return {
    startPreparation,
    startValidation,
    startSubmission,
    setFieldCount,
    recordSubmission
  };
}

/**
 * Hook to track user interactions
 * @returns Function to record user interactions
 */
export function useInteractionTracking() {
  // Record a user interaction with timing
  const trackInteraction = useCallback((eventType: string, targetElement: string, callback: () => void) => {
    const startTime = performance.now();
    
    try {
      callback();
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      FrontendPerformanceService.recordUserInteraction(
        eventType,
        targetElement,
        duration
      );
    }
  }, []);
  
  return { trackInteraction };
}

/**
 * Hook to initialize performance monitoring for a page
 * @param userId Optional user ID for tracking
 */
export function useInitPerformanceMonitoring(userId?: string) {
  useEffect(() => {
    // Initialize performance monitoring
    FrontendPerformanceService.init(userId);
    
    return () => {
      // Upload any pending metrics on page unmount
      FrontendPerformanceService.uploadMetrics();
    };
  }, [userId]);
}

/**
 * Hook to track navigation performance
 * @param onRouteChange Callback to execute on route change
 */
export function useNavigationPerformance(onRouteChange?: (url: string) => void) {
  useEffect(() => {
    let lastNavigationStart = 0;
    
    // Handle route changes
    const handleRouteChange = (url: string) => {
      // Record previous page's metrics before changing
      FrontendPerformanceService.uploadMetrics();
      
      // Reset for new page
      lastNavigationStart = performance.now();
      
      // Call custom handler if provided
      if (onRouteChange) {
        onRouteChange(url);
      }
    };

    // Handle route change complete
    const handleRouteComplete = (url: string) => {
      if (lastNavigationStart > 0) {
        const navigationTime = performance.now() - lastNavigationStart;
        
        // Record as a special user interaction
        FrontendPerformanceService.recordUserInteraction(
          'navigation',
          url,
          navigationTime
        );
        
        lastNavigationStart = 0;
      }
    };
    
    // Set up listeners for Next.js router events
    if (typeof window !== 'undefined') {
      const router = require('next/router');
      
      router.events.on('routeChangeStart', handleRouteChange);
      router.events.on('routeChangeComplete', handleRouteComplete);
      
      return () => {
        router.events.off('routeChangeStart', handleRouteChange);
        router.events.off('routeChangeComplete', handleRouteComplete);
      };
    }
  }, [onRouteChange]);
}

/**
 * Higher-order component to track component render performance
 * @param Component Component to wrap
 * @param componentName Name of the component to track
 * @returns Wrapped component with performance tracking
 */
export function withPerformanceTracking<P>(Component: React.ComponentType<P>, componentName: string) {
  return function WrappedWithPerformance(props: P) {
    useRenderPerformance(componentName);
    
    return React.createElement(Component, props);
  };
}

/**
 * Hook that tracks network performance for a specific API call
 * @returns Object with function to track fetch calls
 */
export function useNetworkPerformance() {
  // Track a fetch call
  const trackFetch = useCallback(async <T>(
    url: string,
    options?: RequestInit,
    resourceType = 'api'
  ): Promise<T> => {
    const startTime = performance.now();
    let responseSize = 0;
    let requestSize = 0;
    
    // Calculate request size if body present
    if (options?.body) {
      requestSize = new Blob([options.body.toString()]).size;
    }
    
    try {
      const response = await fetch(url, options);
      
      // Get response data and calculate size
      const responseClone = response.clone();
      const responseData = await responseClone.json();
      const responseText = JSON.stringify(responseData);
      responseSize = new Blob([responseText]).size;
      
      // Record network request performance
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      FrontendPerformanceService._recordNetworkRequest({
        url,
        route: typeof window !== 'undefined' ? window.location.pathname : '',
        method: options?.method || 'GET',
        duration,
        status: response.status,
        requestSize,
        responseSize,
        resourceType,
        cached: response.headers.get('x-cache') === 'HIT',
        timestamp: new Date().toISOString(),
        userId: undefined
      });
      
      return responseData as T;
    } catch (error) {
      // Record failed request
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      FrontendPerformanceService._recordNetworkRequest({
        url,
        route: typeof window !== 'undefined' ? window.location.pathname : '',
        method: options?.method || 'GET',
        duration,
        status: 0,
        requestSize,
        responseSize: 0,
        resourceType,
        cached: false,
        timestamp: new Date().toISOString(),
        userId: undefined
      });
      
      throw error;
    }
  }, []);
  
  return { trackFetch };
}

export default {
  useRenderPerformance,
  useFormPerformance,
  useInteractionTracking,
  useInitPerformanceMonitoring,
  useNavigationPerformance,
  withPerformanceTracking,
  useNetworkPerformance
}; 