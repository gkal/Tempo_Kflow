/**
 * Utility functions for audit logging.
 * This file provides a simplified interface for logging audit activities.
 */
import { auditTrailService, AuditActionType, AuditSeverity } from '@/services/auditTrailService';

interface LogActivityParams {
  activity_type: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any>;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source_ip?: string;
  target_name?: string;
}

/**
 * Log an activity in the audit trail
 * @param params Activity parameters to log
 * @returns Promise that resolves when logging is complete
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const {
      activity_type,
      user_id,
      entity_type,
      entity_id,
      details = {},
      severity = 'INFO',
      source_ip,
      target_name
    } = params;

    // Convert string severity to enum
    const severityEnum = severity === 'INFO' ? AuditSeverity.INFO :
                         severity === 'WARNING' ? AuditSeverity.WARNING :
                         severity === 'ERROR' ? AuditSeverity.ERROR :
                         severity === 'CRITICAL' ? AuditSeverity.CRITICAL :
                         AuditSeverity.INFO;

    await auditTrailService.log({
      action: activity_type as unknown as AuditActionType, // Cast to unknown first to bypass strict typing
      userId: user_id,
      targetType: entity_type,
      targetId: entity_id,
      description: `${activity_type} - ${target_name || entity_id}`,
      severity: severityEnum,
      metadata: {
        ip_address: source_ip || '0.0.0.0'
      },
      details,
      tags: [entity_type, activity_type.toLowerCase()]
    });
  } catch (error) {
    // Don't let audit logging errors affect the main application flow
    console.error('Error logging activity to audit trail:', error);
  }
} 