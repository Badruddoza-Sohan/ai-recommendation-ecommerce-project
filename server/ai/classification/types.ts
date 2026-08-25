/**
 * Classification Types
 */

export type Domain = "support" | "fashion" | "voice" | "seller" | "recommendation" | "gadgets" | "general";

export interface ClassificationResult {
  intent: string;
  domain: Domain;
  confidence: number;
  /** Top-3 nearest training examples (for explainability) */
  nearestExamples: Array<{ text: string; intent: string; score: number }>;
  /** Human-readable reason for classification */
  reason: string;
}

export interface SentimentResult {
  /** Overall sentiment: "positive" | "neutral" | "negative" */
  sentiment: "positive" | "neutral" | "negative";
  /** Score from -1.0 (very negative) to 1.0 (very positive) */
  score: number;
  /** Primary emotion detected */
  emotion: string;
  /** Urgency level 0–1 */
  urgency: number;
  /** Whether this message should be escalated to a human */
  shouldEscalate: boolean;
}

export interface TrainingExample {
  domain: Domain;
  intent: string;
  text: string;
}
