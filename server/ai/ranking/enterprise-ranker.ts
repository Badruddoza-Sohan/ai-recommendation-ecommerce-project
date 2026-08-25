export interface ProductCandidate {
  id: number;
  name: string;
  price: number;
  category: string;
  color?: string;
  fabric?: string;
  season?: string;
  rating?: number;
  sold_count?: number;
  stock_quantity: number;
  tags?: string[];
}

export interface RankingContext {
  occasion?: string;
  weather?: string;
  style_preference?: string;
  preferred_colors?: string[];
  avoid_colors?: string[];
  owned_items?: string[];
  user_budget_tier?: "budget" | "mid" | "luxury";
}

export interface ScoredProduct extends ProductCandidate {
  final_score: number;
  score_breakdown: {
    occasion_score: number;
    weather_score: number;
    style_score: number;
    personalization_score: number;
    compatibility_score: number;
    popularity_score: number;
    inventory_score: number;
  };
}

export class EnterpriseRanker {
  private weights = {
    w_occasion: 0.25,
    w_weather: 0.15,
    w_style: 0.15,
    w_personalization: 0.20,
    w_compatibility: 0.10,
    w_popularity: 0.05,
    w_inventory: 0.10,
  };

  public rankProducts(candidates: ProductCandidate[], context: RankingContext): ScoredProduct[] {
    const scored: ScoredProduct[] = [];

    for (const p of candidates) {
      // 1. Inventory Check (Hard Zero if out of stock)
      const inventory_score = p.stock_quantity > 0 ? (p.stock_quantity > 5 ? 1.0 : 0.6) : 0.0;
      if (inventory_score === 0.0) {
        continue; // Exclude out-of-stock SKUs completely
      }

      // 2. Avoid Color Strict Exclusions
      if (context.avoid_colors && p.color && context.avoid_colors.some((ac) => ac.toLowerCase() === p.color?.toLowerCase())) {
        continue; // Exclude avoided colors completely
      }

      // 3. Occasion Match Score
      let occasion_score = 0.5;
      if (context.occasion) {
        const occLower = context.occasion.toLowerCase();
        if (p.tags?.some((t) => t.toLowerCase().includes(occLower)) || p.name.toLowerCase().includes(occLower)) {
          occasion_score = 1.0;
        }
      }

      // 4. Weather Match Score
      let weather_score = 0.5;
      if (context.weather) {
        const wLower = context.weather.toLowerCase();
        if (wLower.includes("summer") && (p.fabric?.toLowerCase().includes("cotton") || p.fabric?.toLowerCase().includes("linen"))) {
          weather_score = 1.0;
        } else if (wLower.includes("winter") && (p.fabric?.toLowerCase().includes("silk") || p.fabric?.toLowerCase().includes("wool"))) {
          weather_score = 1.0;
        }
      }

      // 5. Style Score
      let style_score = 0.5;
      if (context.style_preference) {
        const stLower = context.style_preference.toLowerCase();
        if (p.tags?.some((t) => t.toLowerCase().includes(stLower)) || p.name.toLowerCase().includes(stLower)) {
          style_score = 1.0;
        }
      }

      // 6. Personalization Score
      let personalization_score = 0.5;
      if (context.preferred_colors && p.color && context.preferred_colors.some((pc) => pc.toLowerCase() === p.color?.toLowerCase())) {
        personalization_score = 1.0;
      }

      // 7. Compatibility Score
      let compatibility_score = 0.7;

      // 8. Popularity Score
      const popularity_score = Math.min(1.0, ((p.rating || 4.0) / 5.0) * 0.7 + Math.min(0.3, (p.sold_count || 0) / 500));

      // Final Weighted Score
      const final_score =
        this.weights.w_occasion * occasion_score +
        this.weights.w_weather * weather_score +
        this.weights.w_style * style_score +
        this.weights.w_personalization * personalization_score +
        this.weights.w_compatibility * compatibility_score +
        this.weights.w_popularity * popularity_score +
        this.weights.w_inventory * inventory_score;

      scored.push({
        ...p,
        final_score: Number(final_score.toFixed(4)),
        score_breakdown: {
          occasion_score,
          weather_score,
          style_score,
          personalization_score,
          compatibility_score,
          popularity_score,
          inventory_score,
        },
      });
    }

    return scored.sort((a, b) => b.final_score - a.final_score);
  }
}

let instance: EnterpriseRanker | null = null;
export function getEnterpriseRanker(): EnterpriseRanker {
  if (!instance) instance = new EnterpriseRanker();
  return instance;
}
