import { createRouter, publicProcedure } from "./middleware";
import { z } from "zod";
import { buildFallbackOutfitRecommendation, buildFallbackColorMatching } from "../src/lib/fashionStylistUtils";
import { getDb } from "./queries/connection";
import { inventory, products } from "../db/schema";
import { lte, eq } from "../db/mysql";

export const trpcAiRouter = createRouter({
  getOutfitRecommendation: publicProcedure
    .input(
      z.object({
        occasion: z.string(),
        season: z.string().optional(),
        budget: z.number().optional(),
        preferredColors: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      return buildFallbackOutfitRecommendation(input);
    }),

  getColorMatching: publicProcedure
    .input(
      z.object({
        baseColor: z.string(),
        season: z.string().optional(),
        occasion: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return buildFallbackColorMatching(input.baseColor, input.season, input.occasion);
    }),

  getSeasonalSuggestions: publicProcedure
    .input(z.object({ season: z.string() }))
    .query(async ({ input }) => {
      const season = input.season || "spring";
      return {
        season,
        trends: ["Linen tailoring", "Earth tones & Pastels", "Minimalist layering"],
        colors: ["Sage Green", "Cream", "Terracotta", "Sky Blue"],
        keyItems: ["Lightweight Trench", "Relaxed Fit Chinos", "Classic Loafers"],
        colorPalette: ["#A3B18A", "#F5EBE0", "#E07A5F", "#8ECAE6"],
        recommendedProducts: [
          { name: "Linen Blend Blazer", price: 14000, trendScore: 96 },
          { name: "Pastel Oxford Shirt", price: 5500, trendScore: 92 },
        ],
        stylingTips: [
          "Layer lightweight fabrics for unpredictable seasonal weather.",
          "Pair soft pastel tops with grounded neutral bottoms.",
        ],
      };
    }),

  getOccasionStyling: publicProcedure
    .input(
      z.object({
        occasion: z.string(),
        season: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const occasion = input.occasion || "casual";
      const season = input.season || "spring";
      return {
        occasion,
        season,
        formalityLevel: occasion.toLowerCase().includes("wedding") ? 9 : 7,
        recommendedCategories: ["Blazers", "Dresses", "Dress Shoes", "Accessories"],
        colorPalette: ["Navy", "Emerald", "Cream", "Burgundy"],
        avoid: ["Graphic tees", "Ripped denim"],
        productsByCategory: {
          Blazers: [{ name: "Tailored Italian Suit", price: 29000, matchScore: 98 }],
          Dresses: [{ name: "Silk Wrap Dress", price: 18000, matchScore: 95 }],
        },
        stylingTips: [
          `For ${occasion}, focus on well-fitted silhouettes that balance sophistication with comfort.`,
          "Ensure footwear is clean and appropriate for the venue.",
        ],
      };
    }),

  getFashionTrends: publicProcedure
    .input(
      z.object({
        season: z.string(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return {
        season: input.season,
        trends: ["Quiet Luxury", "Retro Sportswear", "Utility Oversized Pockets"],
        colors: ["Charcoal", "Olive", "Mustard", "Off-White"],
        keyItems: ["Oversized Car Coat", "Retro Canvas Sneakers", "Wide Leg Trousers"],
        trendingProducts: [
          { name: "Oversized Wool Blend Coat", price: 22000, trendScore: 98 },
          { name: "Minimalist Leather Sneakers", price: 11000, trendScore: 94 },
        ],
        trendReport: `Top trending styles this ${input.season} emphasize relaxed fits and high-texture fabrics.`,
      };
    }),

  getStyleGuidance: publicProcedure
    .input(
      z.object({
        styleType: z.string(),
        bodyType: z.string().optional(),
        occasion: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return {
        styleType: input.styleType,
        description: `The ${input.styleType} aesthetic focuses on clean lines, high versatility, and timeless wardrobe staples.`,
        tips: [
          "Invest in quality outerwear and leather accessories.",
          "Stick to a consistent 3-color palette per outfit.",
        ],
        suitableForBodyTypes: ["All body types"],
        avoid: ["Clashing noisy patterns"],
        recommendedProducts: [
          { name: "Classic Capsule Trench", price: 17500, styleScore: 97 },
          { name: "Essential White Crewneck", price: 3500, styleScore: 95 },
        ],
        capsuleWardrobe: ["White Shirt", "Tailored Trousers", "Leather Boots", "Neutral Knit"],
      };
    }),

  generateProductDescription: publicProcedure
    .input(
      z.object({
        productName: z.string(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const name = input.productName;
      const cat = input.category || "General";
      return {
        title: `Premium ${name} - High Quality ${cat}`,
        description: `Elevate your everyday experience with the ${name}. Engineered with top-grade materials, modern ergonomics, and exceptional durability. Perfect for ${cat} enthusiasts looking for style and functionality.`,
        insights: [
          "High customer interest in premium durable products.",
          "Including clear dimension & material specs increases conversion by 18%.",
        ],
      };
    }),

  generateKeywords: publicProcedure
    .input(z.object({ productName: z.string() }))
    .query(async ({ input }) => {
      const name = input.productName;
      return {
        keywords: `${name}, buy ${name} online, premium ${name}, best ${name} 2026, top rated ${name}`,
        seoScore: 92,
        suggestions: [
          "Add brand name to target high-intent buyers.",
          "Use long-tail keywords for targeted search traffic.",
        ],
      };
    }),

  getLowStockAlert: publicProcedure.query(async ({ ctx }) => {
    try {
      const db = getDb();
      let sellerId: number | null = null;

      if (ctx.user) {
        const { sellers } = await import("../db/schema");
        const seller = await db.select().from(sellers).where(eq(sellers.userId, (ctx.user as any).id)).limit(1);
        if (seller[0]) sellerId = seller[0].id;
      }

      const { and } = await import("../db/mysql");
      const condition = sellerId
        ? and(lte(inventory.quantity, 5), eq(products.sellerId, sellerId))
        : lte(inventory.quantity, 5);

      const lowStockItems = await db
        .select({
          productId: (inventory as any).productId,
          productName: (products as any).name,
          currentStock: (inventory as any).quantity,
        })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(condition);

      return lowStockItems;
    } catch (err) {
      console.error("[TRPCAiRouter] getLowStockAlert error:", err);
      return [];
    }
  }),
});
