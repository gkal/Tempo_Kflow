/**
 * API Performance Monitoring Middleware
 * 
 * This middleware provides automatic tracking of API performance metrics
 * by wrapping API handlers and measuring response times, error rates,
 * and other performance indicators.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import ApiPerformanceService from './apiPerformanceService';
import { ApiPerformanceData } from './apiPerformanceService';

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<any>;

/**
 * Wraps a Next.js API handler with performance monitoring
 * @param handler The API handler to wrap
 * @returns A wrapped handler that records performance metrics
 */
export function withApiPerformanceTracking(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Start timing the request
    const startTime = performance.now();
    
    // Create a custom response object to intercept the response
    const customRes = new Proxy(res, {
      get: (target, prop) => {
        const value = Reflect.get(target, prop);
        
        // Intercept the status and send methods to capture response data
        if (prop === 'status') {
          return (statusCode: number) => {
            (res as any)._statusCode = statusCode;
            return target.status(statusCode);
          };
        }
        
        if (prop === 'send' || prop === 'json' || prop === 'end') {
          return async (...args: any[]) => {
            // Calculate response time
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            // Get the response status code
            const statusCode = (res as any)._statusCode || res.statusCode || 200;
            
            // Determine if the response is successful (2xx status code)
            const success = statusCode >= 200 && statusCode < 300;
            
            // Prepare performance data
            const performanceData: ApiPerformanceData = {
              endpoint: `${req.url}`,
              method: req.method || 'UNKNOWN',
              responseTime,
              timestamp: new Date().toISOString(),
              statusCode,
              success,
              requestSize: req.headers['content-length'] ? 
                parseInt(req.headers['content-length'] as string, 10) : undefined,
              responseSize: typeof args[0] === 'object' ? 
                JSON.stringify(args[0]).length : 
                (typeof args[0] === 'string' ? args[0].length : undefined),
              userAgent: req.headers['user-agent'],
              ipAddress: req.headers['x-forwarded-for'] as string || 
                         req.connection.remoteAddress,
              userId: (req as any).user?.id
            };

            // Record the performance data asynchronously (don't block the response)
            ApiPerformanceService.recordApiPerformance(performanceData)
              .catch(err => console.error('Failed to record API performance:', err));
            
            // Call the original method
            return value.apply(target, args);
          };
        }
        
        // Return the original method for other properties
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    
    try {
      // Call the original handler with our custom response object
      return await handler(req, customRes);
    } catch (error) {
      // Calculate response time for errors
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Record the error
      const performanceData: ApiPerformanceData = {
        endpoint: `${req.url}`,
        method: req.method || 'UNKNOWN',
        responseTime,
        timestamp: new Date().toISOString(),
        statusCode: 500,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        userAgent: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] as string || 
                   req.connection.remoteAddress,
        userId: (req as any).user?.id
      };
      
      // Record the performance data asynchronously
      ApiPerformanceService.recordApiPerformance(performanceData)
        .catch(err => console.error('Failed to record API error performance:', err));
      
      // Re-throw the error to let the default error handler process it
      throw error;
    }
  };
}

/**
 * Creates a decorator for tracking form API performance
 * @param endpoint API endpoint name (for grouping)
 * @returns A decorator function that wraps the target method
 */
export function TrackFormApiPerformance(endpoint: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const startTime = performance.now();
      let success = false;
      let error: Error | null = null;
      let result: any;
      let statusCode = 200;
      
      try {
        result = await originalMethod.apply(this, args);
        success = true;
        
        // Try to extract status code from result if it's an API response
        if (result && typeof result === 'object' && 'statusCode' in result) {
          statusCode = result.statusCode;
          success = statusCode >= 200 && statusCode < 300;
        }
        
        return result;
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        statusCode = 500;
        success = false;
        throw err;
      } finally {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Extract context from args if available
        const context = args.length > 0 && typeof args[0] === 'object' ? args[0] : {};
        
        // Record performance metrics asynchronously
        ApiPerformanceService.recordApiPerformance({
          endpoint,
          method: propertyKey,
          responseTime,
          timestamp: new Date().toISOString(),
          statusCode,
          success,
          errorMessage: error?.message,
          userId: context.userId || context.user?.id,
          // Add more context if needed
        }).catch(err => {
          console.error('Failed to record API performance:', err);
        });
      }
    };
    
    return descriptor;
  };
}

/**
 * Higher-order function to wrap API functions with performance tracking
 * @param apiFn API function to wrap
 * @param endpoint API endpoint name
 * @param method HTTP method (GET, POST, etc.)
 * @returns Wrapped function with performance tracking
 */
export function withFormApiPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  apiFn: T,
  endpoint: string,
  method: string = 'POST'
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now();
    let success = false;
    let error: Error | null = null;
    let result: any;
    let statusCode = 200;
    
    try {
      result = await apiFn(...args);
      success = true;
      
      // Try to extract status code from result if it's an API response
      if (result && typeof result === 'object' && 'statusCode' in result) {
        statusCode = result.statusCode;
        success = statusCode >= 200 && statusCode < 300;
      }
      
      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      statusCode = 500;
      success = false;
      throw err;
    } finally {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Extract user context if available
      const context = args.length > 0 && typeof args[0] === 'object' ? args[0] : {};
      
      // Record performance metrics asynchronously without blocking
      ApiPerformanceService.recordApiPerformance({
        endpoint,
        method,
        responseTime,
        timestamp: new Date().toISOString(),
        statusCode,
        success,
        errorMessage: error?.message,
        userId: context.userId || context.user?.id,
        // Add more context as needed
      }).catch(err => {
        console.error('Failed to record API performance:', err);
      });
    }
  }) as T;
}

export default {
  withApiPerformanceTracking,
  TrackFormApiPerformance,
  withFormApiPerformanceTracking
}; 