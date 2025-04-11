import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Rate limiter for performance data uploads
const RATE_LIMIT = {
  WINDOW_MS: 1000 * 60, // 1 minute
  MAX_REQUESTS: 10       // 10 requests per minute
};

// In-memory rate limiter store (resets on server restart)
const rateLimitStore: Record<string, { count: number, resetTime: number }> = {};

/**
 * API endpoint to receive and store frontend performance metrics
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only support POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Apply rate limiting
  const clientIP = req.headers['x-forwarded-for'] || 
                  req.socket.remoteAddress || 
                  'unknown';
                  
  // Check if IP is rate limited
  if (isRateLimited(clientIP as string)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  try {
    // Get user session if available
    const session = await getServerSession(req, res, authOptions);
    
    // Get request body
    const { metrics, sessionId } = req.body;
    
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ error: 'Invalid metrics data' });
    }
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Process each metric
    const results = await Promise.all(
      metrics.map(async (metric) => {
        // Validate metric data
        if (!metric.type || !metric.data) {
          return { success: false, error: 'Invalid metric format' };
        }
        
        // Insert metric into database
        const { error } = await supabase
          .from('frontend_performance_logs')
          .insert({
            session_id: sessionId,
            user_id: session?.user?.id,
            metric_type: metric.type,
            metric_data: metric.data
          });
        
        if (error) {
          console.error('Error storing performance metric:', error);
          return { success: false, error: error.message };
        }
        
        return { success: true };
      })
    );
    
    // Check if all metrics were stored successfully
    const allSuccess = results.every(result => result.success);
    
    if (allSuccess) {
      return res.status(200).json({ success: true });
    } else {
      const errors = results
        .filter(result => !result.success)
        .map(result => result.error);
      
      return res.status(207).json({ 
        success: false, 
        message: 'Some metrics failed to store', 
        errors 
      });
    }
  } catch (error) {
    console.error('Error processing performance metrics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check if the client IP is rate limited
 * @param ip Client IP address
 * @returns True if rate limited, false otherwise
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  
  // Get or create rate limit entry
  if (!rateLimitStore[ip]) {
    rateLimitStore[ip] = {
      count: 0,
      resetTime: now + RATE_LIMIT.WINDOW_MS
    };
  }
  
  // Check if window has expired and reset if needed
  if (now > rateLimitStore[ip].resetTime) {
    rateLimitStore[ip] = {
      count: 0,
      resetTime: now + RATE_LIMIT.WINDOW_MS
    };
  }
  
  // Increment count
  rateLimitStore[ip].count++;
  
  // Check if over limit
  return rateLimitStore[ip].count > RATE_LIMIT.MAX_REQUESTS;
}

/**
 * Configure API to accept larger payloads for batch uploads
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}; 