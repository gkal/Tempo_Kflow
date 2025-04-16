import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import FormAnalyticsService, { FormSubmissionAnalytics } from '@/services/analytics/formAnalyticsService';
import { rateLimit } from '@/lib/rateLimit';

// Create a rate limiter
const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per interval
});

/**
 * API handler for form submission analytics
 * Accepts analytics data from form submissions via POST
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Only allow POST method
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Apply rate limiting
    try {
      await limiter.check(res, 20, 'FORM_ANALYTICS_SUBMISSION'); // 20 requests per minute per IP
    } catch {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Get user session if available
    const session = await getServerSession(req, res, authOptions);
    
    // Parse the submission data
    const analyticsData: FormSubmissionAnalytics = {
      ...req.body,
      // Add user ID if authenticated
      userId: session?.user?.id || req.body.userId || undefined
    };

    // Validate required fields
    if (!analyticsData.formId || !analyticsData.submissionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Record the analytics data
    const success = await FormAnalyticsService.trackFormSubmission(analyticsData);
    
    if (success) {
      return res.status(200).json({ status: 'success' });
    } else {
      return res.status(500).json({ error: 'Failed to record analytics data' });
    }
  } catch (error) {
    console.error('Error processing form analytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 