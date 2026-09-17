export interface FeatureFlags {
  enable_rag: boolean;
  enable_memory: boolean;
  enable_explainability: boolean;
  enable_ranking_engine: boolean;
  enable_personalization: boolean;
  enable_ab_testing: boolean;
  enable_security_guardrails: boolean;
  enable_customer_support: boolean;
}

export class FeatureFlagEngine {
  private flags: FeatureFlags = {
    enable_rag: true,
    enable_memory: true,
    enable_explainability: true,
    enable_ranking_engine: true,
    enable_personalization: true,
    enable_ab_testing: true,
    enable_security_guardrails: true,
    enable_customer_support: true,
  };

  public getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  public isEnabled(flagName: keyof FeatureFlags): boolean {
    return this.flags[flagName] ?? true;
  }

  public toggleFlag(flagName: keyof FeatureFlags, enabled: boolean): FeatureFlags {
    this.flags[flagName] = enabled;
    console.log(`[FeatureFlagEngine] Flag '${flagName}' updated to: ${enabled}`);
    return this.getFlags();
  }
}

let instance: FeatureFlagEngine | null = null;
export function getFeatureFlagEngine(): FeatureFlagEngine {
  if (!instance) instance = new FeatureFlagEngine();
  return instance;
}
