export class SecurityGuardrails {
  private requestCounts = new Map<string, { count: number; resetAt: number }>();
  private rateLimitMax = 60; // 60 requests per minute
  private windowMs = 60 * 1000;

  private injectionPatterns = [
    /ignore previous instructions/i,
    /system prompt/i,
    /reveal key/i,
    /dump database/i,
    /<script>/i,
    /DROP TABLE/i,
  ];

  public validateInput(input: string, clientIp: string): { allowed: boolean; reason?: string } {
    // 1. Rate Limiting Check
    const now = Date.now();
    const clientData = this.requestCounts.get(clientIp) || { count: 0, resetAt: now + this.windowMs };

    if (now > clientData.resetAt) {
      clientData.count = 1;
      clientData.resetAt = now + this.windowMs;
    } else {
      clientData.count += 1;
    }
    this.requestCounts.set(clientIp, clientData);

    if (clientData.count > this.rateLimitMax) {
      return { allowed: false, reason: "Rate limit exceeded. Maximum 60 requests per minute allowed." };
    }

    // 2. Prompt Injection Detection Check
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(input)) {
        return { allowed: false, reason: "Security Policy Violation: Prompt injection or restricted payload detected." };
      }
    }

    return { allowed: true };
  }
}

let instance: SecurityGuardrails | null = null;
export function getSecurityGuardrails(): SecurityGuardrails {
  if (!instance) instance = new SecurityGuardrails();
  return instance;
}
