/**
 * Production Weather & Humidity Fabric Engine
 *
 * Takes dynamic weather inputs (Temperature °C, Humidity %, Rain risk, Indoor AC vs Outdoor)
 * and selects optimal breathable fabrics and layering strategies for Bangladesh.
 */

export interface WeatherCondition {
  temperatureC: number;
  humidityPercent: number;
  isIndoorAC: boolean;
  rainRisk: boolean;
}

export interface FabricRecommendation {
  primaryFabric: string;
  liningFabric: string;
  breathabilityRating: string; // e.g. "98% High Breathability"
  layeringTip: string;
}

export class WeatherEngine {
  /**
   * Determine optimal fabric based on ambient temperature and humidity
   */
  evaluateFabric(condition: Partial<WeatherCondition>): FabricRecommendation {
    const temp = condition.temperatureC ?? 32; // Default summer temp in BD
    const humidity = condition.humidityPercent ?? 85; // Default high humidity
    const isAC = condition.isIndoorAC ?? false;

    if (temp > 30 && humidity > 80 && !isAC) {
      return {
        primaryFabric: "100% Breathable Taant / Handloom Cotton",
        liningFabric: "Ultra-Light Muslin Cotton Lining",
        breathabilityRating: "98% Maximum Airflow",
        layeringTip: "Avoid heavy synthetic linings. Stick to single-layer handloom weaves to combat humid heat.",
      };
    }

    if (isAC) {
      return {
        primaryFabric: "Premium Silk / Fine Cotton-Silk Blend",
        liningFabric: "Soft Breathable Viscose",
        breathabilityRating: "88% Balanced Indoor Thermal Comfort",
        layeringTip: "Controlled AC hall temperatures allow structured silk panjabis or lightweight blazers without overheating.",
      };
    }

    return {
      primaryFabric: "Fine Pima Cotton / Linen-Cotton Blend",
      liningFabric: "Light Cotton Lining",
      breathabilityRating: "92% High Comfort",
      layeringTip: "Pima cotton provides crisp structured drape while absorbing ambient moisture naturally.",
    };
  }
}

let weatherEngineInstance: WeatherEngine | null = null;
export function getWeatherEngine(): WeatherEngine {
  if (!weatherEngineInstance) {
    weatherEngineInstance = new WeatherEngine();
  }
  return weatherEngineInstance;
}
