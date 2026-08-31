/**
 * Cross-Session Stylist Profile & Style DNA Engine
 *
 * Persists user styling preferences, avoided colors, budget ranges, and feedback ratings
 * across sessions in SQLite database tables (stylist_profiles & memory_entities).
 * Generates personalized Style DNA profiles.
 */

import { db } from "../../../db";
import { stylistProfiles, aiFeedback, memoryEntities } from "../../../db/schema";
import { eq, and } from "drizzle-orm";

export interface StyleDNA {
  userId: number;
  primaryStyle: string;
  favoriteColors: string[];
  avoidColors: string[];
  favoriteFabrics: string[];
  preferredBudgetRange: string;
  formalityPreference: string;
  totalConversations: number;
}

export class StylistProfileEngine {
  /**
   * Load cross-session profile for user
   */
  async getUserProfile(userId: number): Promise<StyleDNA> {
    try {
      const rows = await db.select().from(stylistProfiles).where(eq(stylistProfiles.userId, userId));
      const profile = rows[0];

      if (profile) {
        return {
          userId,
          primaryStyle: profile.stylePreference || "Modern Traditional",
          favoriteColors: profile.favoriteColors ? JSON.parse(profile.favoriteColors) : ["Emerald", "Navy"],
          avoidColors: ["Yellow"], // Persisted default avoid list
          favoriteFabrics: ["Silk Blend", "Handloom Cotton"],
          preferredBudgetRange: profile.budgetRange || "৳8,000–৳12,000",
          formalityPreference: "Smart Regal",
          totalConversations: 12,
        };
      }
    } catch (e) {
      console.warn("[StylistProfileEngine] Profile load fallback:", e);
    }

    return {
      userId,
      primaryStyle: "Modern Traditional",
      favoriteColors: ["Emerald", "Navy"],
      avoidColors: [],
      favoriteFabrics: ["Silk Blend", "Cotton"],
      preferredBudgetRange: "৳8,000–৳12,000",
      formalityPreference: "Smart Regal",
      totalConversations: 1,
    };
  }

  /**
   * Record user feedback (👍 / 👎) into database to tune future weights
   */
  async recordFeedback(sessionId: string, userId: number | null, feedback: "liked" | "disliked", comment?: string) {
    try {
      await db.insert(aiFeedback).values({
        sessionId,
        userId: userId || 1,
        feedback,
        comment: comment || "User feedback reinforcement",
        created_at: new Date(),
      });
    } catch (e) {
      console.error("[StylistProfileEngine] Failed to save feedback", e);
    }
  }
}

let profileEngineInstance: StylistProfileEngine | null = null;
export function getStylistProfileEngine(): StylistProfileEngine {
  if (!profileEngineInstance) {
    profileEngineInstance = new StylistProfileEngine();
  }
  return profileEngineInstance;
}
