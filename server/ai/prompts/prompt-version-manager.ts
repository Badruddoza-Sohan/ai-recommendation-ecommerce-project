export interface PromptVersion {
  version: string;
  created_at: string;
  author: string;
  description: string;
  template_text: string;
  is_active: boolean;
}

export class PromptVersionManager {
  private versions: Map<string, PromptVersion> = new Map([
    [
      "v1.0.0",
      {
        version: "v1.0.0",
        created_at: "2026-07-01",
        author: "AI Team Baseline",
        description: "Initial baseline prompt template",
        template_text: "You are a fashion stylist for an e-commerce platform...",
        is_active: false,
      },
    ],
    [
      "v2.1.0-enterprise",
      {
        version: "v2.1.0-enterprise",
        created_at: "2026-07-23",
        author: "Lead AI Engineer",
        description: "Enterprise state-aware prompt with strict negation and wardrobe rules",
        template_text: "You are StyleMate AI, an expert, high-end AI Personal Fashion Stylist for a Bangladeshi fashion e-commerce platform...",
        is_active: true,
      },
    ],
  ]);

  public getActiveVersion(): PromptVersion {
    for (const v of this.versions.values()) {
      if (v.is_active) return v;
    }
    return Array.from(this.versions.values())[0];
  }

  public getAllVersions(): PromptVersion[] {
    return Array.from(this.versions.values());
  }

  public activateVersion(versionStr: string): boolean {
    if (!this.versions.has(versionStr)) return false;

    for (const v of this.versions.values()) {
      v.is_active = v.version === versionStr;
    }
    console.log(`[PromptVersionManager] Activated prompt version: ${versionStr}`);
    return true;
  }
}

let instance: PromptVersionManager | null = null;
export function getPromptVersionManager(): PromptVersionManager {
  if (!instance) instance = new PromptVersionManager();
  return instance;
}
