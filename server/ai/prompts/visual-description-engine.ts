export interface OutfitVisualInput {
  topName: string;
  bottomName: string;
  shoesName: string;
  colorPalette: string;
  occasion?: string;
  ownedBottom?: string;
}

export class VisualDescriptionEngine {
  public paintSilhouette(input: OutfitVisualInput): string {
    if (input.ownedBottom) {
      return `The **${input.topName}** creates a clean, commanding upper silhouette that naturally draws eyes to its refined embroidery. Paired with your existing **${input.ownedBottom}**, the contrast feels intentional and polished. Finishing with handcrafted **${input.shoesName}** adds warm, grounded sophistication.`;
    }

    return `The **${input.topName}** paired with crisp **${input.bottomName}** creates a well-proportioned, elegant silhouette. Handcrafted **${input.shoesName}** provide warm contrast under warm venue lighting, offering a balanced look that is sophisticated without feeling overwrought.`;
  }
}

let instance: VisualDescriptionEngine | null = null;
export function getVisualDescriptionEngine(): VisualDescriptionEngine {
  if (!instance) instance = new VisualDescriptionEngine();
  return instance;
}
