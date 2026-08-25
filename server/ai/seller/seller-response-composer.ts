/**
 * Recommendation Composer
 * Converts structured engine outputs into the unified AIResponse contract.
 */

import type {
  AIResponse,
  Action,
  AnalyticsEngineResult,
  DescriptionEngineResult,
  InventoryEngineResult,
  PricingEngineResult,
  ProductQualityResult,
  SEOEngineResult,
  Section,
  SellerContext,
} from "./types.ts";

export class SellerResponseComposer {
  compose(params: {
    intent: string;
    context: SellerContext;
    description?: DescriptionEngineResult;
    seo?: SEOEngineResult;
    inventory?: InventoryEngineResult;
    pricing?: PricingEngineResult;
    analytics?: AnalyticsEngineResult;
    quality?: ProductQualityResult;
  }): AIResponse {
    const { intent, context, description, seo, inventory, pricing, analytics, quality } = params;

    const sections: Section[] = [];
    const actions: Action[] = [];
    let title = "Product Optimization & Guidance";
    let summary = `Product guidance generated for ${context.productName || "your item"}.`;

    // 1. Description Section
    if (description) {
      sections.push({
        title: "Product Title & Copy",
        type: "text",
        content: `**Suggested Title:** ${description.title}\n\n**Generated Description:**\n${description.description}`,
      });
      sections.push({
        title: "Key Highlights",
        type: "list",
        content: description.bulletPoints,
      });
    }

    // 2. SEO Section
    if (seo) {
      sections.push({
        title: "SEO Performance & Target Keywords",
        type: "metrics",
        content: {
          seoScore: `${seo.seoScore}/100`,
          searchIntent: seo.searchIntent,
          metaTitle: seo.metaTitle,
          targetKeywords: seo.keywords.slice(0, 5).join(", "),
          missingKeywords: seo.missingKeywords.join(", "),
        },
      });
    }

    // 3. Inventory Section
    if (inventory) {
      sections.push({
        title: "Inventory & Stock Analysis",
        type: "alert",
        content: {
          currentStock: inventory.stock,
          status: inventory.status.toUpperCase(),
          estimatedDaysRemaining: inventory.outOfStockPredictionDays,
          recommendation: inventory.recommendation,
          lowStockAlerts: inventory.lowStockItems,
        },
      });
    }

    // 4. Pricing Section
    if (pricing) {
      sections.push({
        title: "Pricing & Profit Margin Analysis",
        type: "metrics",
        content: {
          currentPrice: `BDT ${pricing.currentPrice.toLocaleString()}`,
          estimatedProfitPerUnit: `BDT ${pricing.estimatedProfitPerUnit.toLocaleString()} (${pricing.estimatedMarginPercent}% margin)`,
          competitorPriceRange: pricing.competitorPriceRange,
          recommendation: pricing.recommendation,
        },
      });
    }

    // 5. Analytics Section
    if (analytics) {
      sections.push({
        title: "Store Performance & Sales Analytics",
        type: "metrics",
        content: {
          salesThisMonth: analytics.salesThisMonth,
          revenueThisMonth: `BDT ${analytics.revenueThisMonth.toLocaleString()}`,
          growth: `+${analytics.growthPercent}%`,
          conversionRate: `${analytics.conversionRatePercent}%`,
          summary: analytics.summary,
        },
      });
    }

    // 6. Quality Section
    if (quality) {
      sections.push({
        title: "Listing Quality Score",
        type: "metrics",
        content: {
          qualityScore: `${quality.qualityScore}/100`,
          issuesFound: quality.issues.length,
          recommendations: quality.issues,
        },
      });
    }

    // Assemble Smart Quick Actions based on context & results
    if (seo && seo.missingKeywords.length > 0) {
      actions.push({ id: "action_seo", label: "Improve SEO", action: "generate_keywords", payload: { productName: context.productName } });
    }
    if (inventory && (inventory.status === "low_stock" || inventory.status === "out_of_stock")) {
      actions.push({ id: "action_restock", label: "Restock Product", action: "check_inventory" });
    }
    if (pricing && pricing.suggestedDiscountPercent > 0) {
      actions.push({ id: "action_price", label: "Optimize Price", action: "optimize_price" });
    }
    actions.push({ id: "action_desc", label: "Generate Better Description", action: "write_description" });
    actions.push({ id: "action_analytics", label: "View Analytics", action: "show_analytics" });

    // Set title and summary according to primary intent
    if (intent === "product_description") {
      title = "Product Copy Generation";
      summary = `Generated optimized listing copy for "${context.productName || "Product"}".`;
    } else if (intent === "keywords_seo" || intent === "seo_optimization") {
      title = "SEO Strategy & Keyword Analysis";
      summary = `SEO score is ${seo?.seoScore || 91}/100. Key missing keywords identified for higher rank.`;
    } else if (intent === "inventory_alert" || intent === "inventory_insights") {
      title = "Inventory Health & Restock Warning";
      summary = inventory?.status === "low_stock" || inventory?.status === "out_of_stock"
        ? `Attention: ${inventory.stock} units remaining. Restock recommended immediately.`
        : "Inventory levels are healthy across all active SKUs.";
    } else if (intent === "analytics_insights" || intent === "sales_analytics") {
      title = "Sales & Store Analytics Overview";
      summary = analytics?.summary || "Store performance is trending upwards this month.";
    } else if (intent === "pricing_analysis") {
      title = "Pricing & Margin Optimization";
      summary = pricing?.recommendation || "Pricing analysis completed for your active listing.";
    } else if (intent === "product_quality") {
      title = "Listing Quality Audit";
      summary = `Listing Quality Score: ${quality?.qualityScore || 95}/100. ${quality?.issues.length || 0} issues flagged.`;
    }

    return {
      title,
      summary,
      sections,
      actions: actions.slice(0, 5), // max 5 quick actions
      metadata: {
        domain: "seller",
        intent,
        timestamp: new Date().toISOString(),
        seoScore: seo?.seoScore,
        qualityScore: quality?.qualityScore,
      },
    };
  }
}

let instance: SellerResponseComposer | null = null;
export function getSellerResponseComposer(): SellerResponseComposer {
  if (!instance) instance = new SellerResponseComposer();
  return instance;
}
