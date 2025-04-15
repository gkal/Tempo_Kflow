import { z } from 'zod';
import { FormLinkService } from '@/services/formLinkService';
import { FormSubmissionResponse } from '@/services/formLinkService/types';

// Schema validation for request body
const requestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  projectApiKey: z.string().min(1, 'Project API key is required'),
  formData: z.record(z.unknown()).refine(data => {
    // Add any additional form data validation here if needed
    return true;
  }, {
    message: 'Form data is invalid',
  }),
});

/**
 * API endpoint to submit form data from an external application
 * This ensures only authenticated external projects can submit forms
 */
export default async function handler(req, res) {
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

    const { token, projectApiKey, formData } = validationResult.data;

    // Call service method to submit the form data
    const result = await FormLinkService.submitExternalForm(
      token,
      projectApiKey,
      formData
    );

    // Return result
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error submitting external form:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
} 