export interface PreferenceProfile {
  colorWeights: Record<string, number>;
  styleWeights: Record<string, number>;
  avoidColors: string[];
  preferredFit?: string;
}

export class PreferenceAdapterEngine {
  private profiles = new Map<string, PreferenceProfile>();

  public getProfile(sessionId: string): PreferenceProfile {
    if (!this.profiles.has(sessionId)) {
      this.profiles.set(sessionId, {
        colorWeights: {},
        styleWeights: {},
        avoidColors: [],
      });
    }
    return this.profiles.get(sessionId)!;
  }

  public registerUserChoice(sessionId: string, choiceType: "color" | "style" | "reject_color", value: string): PreferenceProfile {
    const profile = this.getProfile(sessionId);

    if (choiceType === "color") {
      profile.colorWeights[value] = (profile.colorWeights[value] || 1.0) + 0.3;
    } else if (choiceType === "style") {
      profile.styleWeights[value] = (profile.styleWeights[value] || 1.0) + 0.3;
    } else if (choiceType === "reject_color") {
      if (!profile.avoidColors.includes(value)) {
        profile.avoidColors.push(value);
      }
      delete profile.colorWeights[value];
    }

    return profile;
  }
}

let instance: PreferenceAdapterEngine | null = null;
export function getPreferenceAdapterEngine(): PreferenceAdapterEngine {
  if (!instance) instance = new PreferenceAdapterEngine();
  return instance;
}
