/**
 * Product Description Engine
 * Dynamically analyzes product name & category semantics to generate tailored titles, descriptions, and feature bullet points.
 */

import type { DescriptionEngineResult, SellerContext } from "../types.ts";

export class DescriptionEngine {
  generate(context: SellerContext, modifier?: string): DescriptionEngineResult {
    const rawName = context.productName?.trim() || "Product";
    const category = (context.category || "general").toLowerCase();
    const isShort = modifier === "short";
    const isPremium = modifier === "premium";
    const isTechnical = modifier === "technical";

    const lowerName = rawName.toLowerCase();

    let descriptor = "crafted for exceptional durability, modern style, and everyday comfort";
    let targetAudience = "discerning buyers seeking high quality and daily reliability";
    let keyFeatures: string[] = [];

    if (lowerName.includes("shirt") || lowerName.includes("blazer") || lowerName.includes("dress") || lowerName.includes("pant") || category === "fashion") {
      descriptor = "tailored from breathable, high-thread-count fabric with reinforced stitching and a modern comfortable fit";
      targetAudience = "fashion-conscious individuals looking for versatile, stylish wardrobe staples";
      keyFeatures = [
        "Premium breathable fabric with a smooth, soft-touch texture and vibrant color retention",
        "Tailored ergonomic fit engineered for all-day comfort and effortless movement",
        "Pre-shrunk and wrinkle-resistant construction for easy low-maintenance care",
        "Versatile design that transitions seamlessly from formal meetings to casual outings",
      ];
    } else if (lowerName.includes("headphone") || lowerName.includes("earbud") || lowerName.includes("watch") || lowerName.includes("laptop") || lowerName.includes("phone") || category === "electronics") {
      descriptor = "engineered with cutting-edge technology, low-latency performance, and energy-efficient operation";
      targetAudience = "tech enthusiasts and professionals demanding peak hardware performance and reliability";
      keyFeatures = [
        "High-fidelity acoustic drivers with rich sound reproduction and deep dynamic response",
        "Low-latency wireless connectivity with fast multi-device instant pairing",
        "Extended battery efficiency with rapid-charge support for all-day usage",
        "Ergonomic sweat-resistant casing built for active daily routines",
      ];
    } else if (lowerName.includes("tea") || lowerName.includes("coffee") || lowerName.includes("food") || category === "food") {
      descriptor = "sourced directly from certified estates, carefully packaged to lock in natural freshness and rich aroma";
      targetAudience = "health-conscious consumers and culinary lovers looking for authentic taste";
      keyFeatures = [
        "100% natural, ethically sourced ingredients with zero artificial flavorings",
        "Rich aroma and deep flavor profile rich in natural antioxidants",
        "Airtight protective packaging for maximum freshness and extended shelf life",
        "Certified quality-checked batch production ensuring pure taste in every serving",
      ];
    } else {
      descriptor = `engineered to provide high utility, modern aesthetics, and daily convenience for your ${category} needs`;
      targetAudience = "shoppers seeking dependable, high-value products";
      keyFeatures = [
        `High-grade construction with durable materials for extended operational lifespan`,
        `Designed for maximum convenience, ergonomic comfort, and effortless operation`,
        `Rigorously quality-tested to meet and exceed market performance standards`,
        `Backed by MarketVerse official seller warranty and quality guarantee`,
      ];
    }

    // Dynamic Title Construction
    let title = `${rawName} - Premium Quality ${this.capitalize(category)}`;
    if (isShort) {
      title = `${rawName} (${this.capitalize(category)})`;
    } else if (isPremium) {
      title = `Bespoke ${rawName} | Signature Luxury Edition`;
    } else if (isTechnical) {
      title = `Pro-Series ${rawName} [High Performance]`;
    }

    // Dynamic Description Construction
    let description = `Upgrade your experience with the ${rawName}, ${descriptor}. Designed for ${targetAudience}, this product balances style with long-lasting performance.`;

    if (isShort) {
      description = `Compact, sleek, and high-performance ${rawName} ${descriptor}.`;
    } else if (isPremium) {
      description = `Immerse yourself in luxury with the handcrafted ${rawName}. Featuring bespoke materials, meticulous craftsmanship, and timeless elegance tailored for ${targetAudience}.`;
    } else if (isTechnical) {
      description = `The ${rawName} is precision-engineered with high-spec components, optimal thermal/structural design, and proven operational efficiency under heavy daily use.`;
    }

    const bulletPoints = keyFeatures;
    const highlights = [
      `Category: ${this.capitalize(category)}`,
      `Quality Grade: A+ Certified`,
      `Audience: ${this.capitalize(targetAudience)}`,
    ];

    return {
      title,
      description,
      bulletPoints,
      highlights,
      features: keyFeatures,
      categoryFormat: `Custom ${this.capitalize(category)} Specification Template`,
    };
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

let instance: DescriptionEngine | null = null;
export function getDescriptionEngine(): DescriptionEngine {
  if (!instance) instance = new DescriptionEngine();
  return instance;
}
