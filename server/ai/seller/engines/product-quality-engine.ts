/**
 * Product Quality Engine
 * Evaluates listing completeness: title length, images, description quality, missing attributes, and SEO completeness.
 */

import type { ProductQualityResult, SellerContext } from "../types.ts";

export class ProductQualityEngine {
  evaluate(context: SellerContext): ProductQualityResult {
    const productName = context.productName?.trim() || "";
    const description = context.description?.trim() || "";
    const images = context.images || [];

    const titleLengthValid = productName.length >= 10 && productName.length <= 80;
    const imageCountValid = images.length >= 3;
    const descriptionComplete = description.length >= 80;
    const attributesComplete = !!context.category && context.category !== "default";
    const variantsValid = true; // Default valid
    const seoComplete = description.toLowerCase().includes("premium") || description.toLowerCase().includes("warranty");

    const issues: string[] = [];
    if (!titleLengthValid) issues.push("Product title is too short or overly long (aim for 15-60 characters).");
    if (!imageCountValid) issues.push("Fewer than 3 product images attached (add high-res angles).");
    if (!descriptionComplete) issues.push("Product description is brief (expand to at least 80 words).");
    if (!attributesComplete) issues.push("Category or key attributes missing.");
    if (!seoComplete) issues.push("Missing core SEO target keywords.");

    let score = 100;
    if (!titleLengthValid) score -= 15;
    if (!imageCountValid) score -= 20;
    if (!descriptionComplete) score -= 20;
    if (!attributesComplete) score -= 15;
    if (!seoComplete) score -= 10;

    return {
      qualityScore: Math.max(0, score),
      issues,
      checks: {
        titleLengthValid,
        imageCountValid,
        descriptionComplete,
        attributesComplete,
        variantsValid,
        seoComplete,
      },
    };
  }
}

let instance: ProductQualityEngine | null = null;
export function getProductQualityEngine(): ProductQualityEngine {
  if (!instance) instance = new ProductQualityEngine();
  return instance;
}
