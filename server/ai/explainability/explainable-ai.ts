export interface RationaleInput {
  occasion?: string;
  weather?: string;
  preferredColor?: string;
  ownedItem?: string;
  productName: string;
  fabric?: string;
}

export class ExplainableAIModule {
  public generateRationale(input: RationaleInput): string {
    const bullets: string[] = [];

    if (input.occasion) {
      bullets.push(`🎯 **Occasion Fit**: Carefully selected to respect traditional/formal requirements for ${input.occasion}.`);
    }

    if (input.preferredColor) {
      bullets.push(`🎨 **Color Harmony**: Styled in ${input.preferredColor} to match your color preference and complement festive aesthetics.`);
    }

    if (input.ownedItem) {
      bullets.push(`🔄 **Wardrobe Integration**: Designed to seamlessly pair with your existing ${input.ownedItem}, eliminating redundant purchases.`);
    }

    if (input.fabric) {
      bullets.push(`🌿 **Fabric Comfort**: Made from premium ${input.fabric} for optimal breathability and luxury drape.`);
    }

    return bullets.join("\n");
  }
}

let instance: ExplainableAIModule | null = null;
export function getExplainableAIModule(): ExplainableAIModule {
  if (!instance) instance = new ExplainableAIModule();
  return instance;
}
