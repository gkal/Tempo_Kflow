import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { FormLinkService } from '@/services/formLinkService';
import { CrossProjectVerificationRequest, CrossProjectVerificationResponse } from '@/services/formLinkService/types';

// Schema validation for request body
const requestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  projectApiKey: z.string().min(1, 'Project API key is required'),
});

/**
 * API endpoint to validate a form link from an external application
 * This ensures only authenticated external projects can validate tokens
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CrossProjectVerificationResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Validate request body
    const validationResult = requestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body: ' + validationResult.error.message,
      });
    }

    const { token, projectApiKey } = validationResult.data;

    // Call service method to verify the external form link
    const result = await FormLinkService.verifyExternalFormLink({
      token,
      projectApiKey,
    });

    // Return result
    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error validating external form link:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
} 