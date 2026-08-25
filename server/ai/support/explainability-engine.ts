/**
 * Explainability & Audit Engine (< 1ms Latency)
 *
 * Records deterministic audit trails and reasoning paths for every AI Customer Success turn:
 *  - Detected Intent & Confidence
 *  - Journey Stage
 *  - Tools Executed
 *  - Policies Applied
 *  - Pipeline Latency
 *  - Reasoning Path
 */

export interface AuditRecord {
  sessionId: string;
  query: string;
  intent: string;
  confidence: number;
  stage: string;
  toolsExecuted: string[];
  policiesApplied: string[];
  latencyMs: number;
  reasoningPath: string;
  timestamp: number;
}

const auditLog: AuditRecord[] = [];

export class ExplainabilityEngine {
  logTurn(record: Omit<AuditRecord, "timestamp">): AuditRecord {
    const fullRecord: AuditRecord = {
      ...record,
      timestamp: Date.now(),
    };

    auditLog.push(fullRecord);
    if (auditLog.length > 500) auditLog.shift(); // Keep latest 500 logs

    return fullRecord;
  }

  getAuditLogs(limit: number = 50): AuditRecord[] {
    return auditLog.slice(-limit).reverse();
  }
}

let instance: ExplainabilityEngine | null = null;
export function getExplainabilityEngine(): ExplainabilityEngine {
  if (!instance) {
    instance = new ExplainabilityEngine();
  }
  return instance;
}
