/**
 * Enterprise AI Seller Assistant V2 Types
 * Unified Response Contract across MarketVerse AI Assistants
 */

export interface Section {
  title: string;
  type: "text" | "list" | "table" | "metrics" | "alert";
  content: string | string[] | Record<string, any>;
}

export interface Action {
  id?: string;
  label: string;
  type?: string;
  action?: string;
  payload?: any;
}

export interface Metadata {
  domain: string;
  intent?: string;
  timestamp?: string;
  qualityScore?: number;
  seoScore?: number;
  executionTimeMs?: number;
  [key: string]: any;
}

export interface AIResponse {
  title: string;
  summary: string;
  sections: Section[];
  actions: Action[];
  metadata: Metadata;
}

export interface SellerContext {
  productName?: string;
  category?: string;
  description?: string;
  price?: number;
  stock?: number;
  images?: string[];
  sessionId?: string;
  modifier?: string;
  sellerId?: number;
  [key: string]: any;
}

export interface DescriptionEngineResult {
  title: string;
  description: string;
  bulletPoints: string[];
  highlights: string[];
  features: string[];
  categoryFormat: string;
}

export interface SEOEngineResult {
  seoScore: number;
  keywords: string[];
  searchIntent: string;
  keywordDensity: string;
  metaTitle: string;
  metaDescription: string;
  missingKeywords: string[];
}

export interface InventoryEngineResult {
  stock: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  outOfStockPredictionDays: number;
  isFastMoving: boolean;
  isDeadStock: boolean;
  recommendation: string;
  lowStockItems?: Array<{ productName: string; currentStock: number }>;
}

export interface PricingEngineResult {
  currentPrice: number;
  suggestedDiscountPercent: number;
  suggestedPrice: number;
  estimatedMarginPercent: number;
  estimatedProfitPerUnit: number;
  competitorPriceRange: string;
  recommendation: string;
}

export interface AnalyticsEngineResult {
  salesThisMonth: number;
  revenueThisMonth: number;
  growthPercent: number;
  conversionRatePercent: number;
  bestSellingCategory: string;
  summary: string;
}

export interface ProductQualityResult {
  qualityScore: number;
  issues: string[];
  checks: {
    titleLengthValid: boolean;
    imageCountValid: boolean;
    descriptionComplete: boolean;
    attributesComplete: boolean;
    variantsValid: boolean;
    seoComplete: boolean;
  };
}
