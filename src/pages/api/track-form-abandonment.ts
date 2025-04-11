import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { FormInteractionType } from '@/services/formTrackingService';

/**
 * API handler for tracking form abandonment events
 * Uses a separate endpoint since these are typically sent via navigator.sendBeacon 
 * during page unload when normal AJAX requests might not complete
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    
    // Validate required fields
    if (!data.formLinkId || !data.interactionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert tracking data into database
    const { error } = await supabase
      .from('form_tracking_events')
      .insert({
        form_link_id: data.formLinkId,
        session_id: data.sessionId,
        interaction_type: FormInteractionType.ABANDONMENT,
        step_name: data.stepName,
        field_name: data.fieldName,
        time_spent: data.timeSpent,
        metadata: data.metadata
      });
    
    if (error) {
      console.error('Error saving abandonment data:', error);
      return res.status(500).json({ error: 'Failed to save tracking data' });
    }
    
    // Return success even though the client likely won't process it
    // This is mainly for testing and debugging
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing abandonment tracking:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 