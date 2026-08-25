export type ABVariant = "VARIANT_A_STANDARD" | "VARIANT_B_ENTERPRISE_EXPLAINABLE";

export interface ABSessionAssignment {
  sessionId: string;
  variant: ABVariant;
  assignedAt: number;
}

export class ABTestingEngine {
  private assignments = new Map<string, ABVariant>();

  public getVariant(sessionId: string): ABVariant {
    if (this.assignments.has(sessionId)) {
      return this.assignments.get(sessionId)!;
    }

    // Hash session ID deterministically to 50/50 split
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = (hash << 5) - hash + sessionId.charCodeAt(i);
      hash |= 0;
    }
    const variant: ABVariant = Math.abs(hash) % 2 === 0 ? "VARIANT_A_STANDARD" : "VARIANT_B_ENTERPRISE_EXPLAINABLE";
    this.assignments.set(sessionId, variant);
    return variant;
  }

  public getVariantConfig(variant: ABVariant) {
    if (variant === "VARIANT_B_ENTERPRISE_EXPLAINABLE") {
      return {
        enableMultiFactorRanking: true,
        enableExplainableRationale: true,
        enableStockLockCheck: true,
        systemPromptVariant: "StylistMate Enterprise v2",
      };
    }
    return {
      enableMultiFactorRanking: false,
      enableExplainableRationale: false,
      enableStockLockCheck: false,
      systemPromptVariant: "StylistMate Baseline v1",
    };
  }
}

let instance: ABTestingEngine | null = null;
export function getABTestingEngine(): ABTestingEngine {
  if (!instance) instance = new ABTestingEngine();
  return instance;
}
