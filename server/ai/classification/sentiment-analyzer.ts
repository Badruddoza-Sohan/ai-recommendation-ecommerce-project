/**
 * Sentiment Analyzer
 *
 * LLM-based sentiment and emotion analysis.
 * Uses the configured LLM to classify user messages into a structured
 * JSON format for sentiment, emotion, and escalation risk.
 *
 * Includes an LRU cache for repeated identical messages and a fast Regex
 * fallback in case the LLM is unavailable.
 */

import { getLLMService } from "../llm/llm-service.ts";
import type { SentimentResult } from "./types.ts";

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, { result: SentimentResult; cachedAt: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCache(text: string): SentimentResult | null {
  const key = text.trim().toLowerCase();
  const entry = cache.get(key);
  if (entry && Date.now() - entry.cachedAt < CACHE_TTL) {
    return entry.result;
  }
  return null;
}

function setCache(text: string, result: SentimentResult) {
  const key = text.trim().toLowerCase();
  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { result, cachedAt: Date.now() });
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────

export class SentimentAnalyzer {
  /**
   * Analyze the sentiment and emotion of a user message.
   *
   * @param text - The user's message
   * @param fallbackOnly - If true, skip the LLM and use the fast Regex fallback
   */
  async analyze(text: string, _fallbackOnly = true): Promise<SentimentResult> {
    const cached = getCache(text);
    if (cached) return cached;

    const fallback = this.fallbackAnalyze(text);
    setCache(text, fallback);
    return fallback;

    const llm = getLLMService();

    const prompt = `Analyze the sentiment of the following customer message.
Return ONLY a valid JSON object with the following schema, and no other text or markdown formatting.
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": number between -1.0 and 1.0,
  "emotion": "happy" | "angry" | "confused" | "frustrated" | "neutral" | "sad" | "anxious" | "relieved",
  "urgency": number between 0.0 and 1.0 (1.0 is extremely urgent),
  "shouldEscalate": boolean (true if the user is very angry, threatening legal action, or explicitly demands a human)
}

Message: "${text}"`;

    try {
      const response = await llm.chat([
        { role: "system", content: "You are a precise JSON-only sentiment analyzer. Output only valid JSON." },
        { role: "user", content: prompt }
      ], {
        temperature: 0.1, // very low for deterministic JSON
        maxTokens: 150
      });

      // Extract JSON from response (in case the model wrapped it in markdown)
      const content = response.message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch?.[0] ?? content;
      
      const result = JSON.parse(jsonString) as SentimentResult;
      
      // Basic validation
      if (!["positive", "neutral", "negative"].includes(result.sentiment)) {
        throw new Error("Invalid sentiment value");
      }
      
      setCache(text, result);
      return result;

    } catch (err) {
      console.warn("[SentimentAnalyzer] LLM analysis failed, using fallback.", (err as any)?.message || String(err));
      const fallback = this.fallbackAnalyze(text);
      setCache(text, fallback);
      return fallback;
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Fast, regex-based fallback for when the LLM is down or for very short messages.
   * Handles English and some basic Banglish/Bengali.
   */
  private fallbackAnalyze(text: string): SentimentResult {
    const lower = text.toLowerCase();
    
    // Negative keywords
    const negative = /\b(angry|bad|terrible|worst|awful|hate|sucks|stupid|idiot|broken|damaged|ruined|fake|scam|disappointed|frustrated|cancel|refund|return|late|never|shitty|bhalo na|nosto|faltu|kharap|baje|খারাপ|বাজে|নষ্ট)\b/g;
    
    // Positive keywords
    const positive = /\b(good|great|awesome|excellent|amazing|love|best|perfect|thanks|thank you|happy|glad|beautiful|nice|bhalo|shundor|valo|ধন্যবাদ|ভালো|সুন্দর)\b/g;
    
    // Urgent keywords
    const urgent = /\b(urgent|now|asap|emergency|hurry|quick|immediately|waiting|taratari|shighroi|তাড়াতাড়ি|এখনই)\b/g;
    
    // Human escalation phrases (require explicit transfer/talk intent)
    const human = /\b(human agent|customer agent|talk to a human|talk to human|speak to a person|speak to an agent|connect to agent|transfer to agent|customer representative|talk to a representative)\b/g;

    const negMatches = (lower.match(negative) || []).length;
    const posMatches = (lower.match(positive) || []).length;
    const urgMatches = (lower.match(urgent) || []).length;
    const humMatches = (lower.match(human) || []).length;

    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    let score = 0;
    let emotion = "neutral";
    let urgency = Math.min(urgMatches * 0.4, 1.0);
    let shouldEscalate = humMatches > 0;

    if (negMatches > posMatches) {
      sentiment = "negative";
      score = Math.max(-1.0, -0.3 * negMatches);
      emotion = "frustrated";
      if (negMatches > 2) shouldEscalate = true;
    } else if (posMatches > negMatches) {
      sentiment = "positive";
      score = Math.min(1.0, 0.3 * posMatches);
      emotion = "happy";
    }

    // Swear words / extreme anger automatically escalate
    if (/\b(fuck|shit|bitch|sue|lawyer|police)\b/.test(lower)) {
      sentiment = "negative";
      score = -1.0;
      emotion = "angry";
      urgency = 1.0;
      shouldEscalate = true;
    }

    return { sentiment, score, emotion, urgency, shouldEscalate };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _sentimentAnalyzer: SentimentAnalyzer | null = null;

export function getSentimentAnalyzer(): SentimentAnalyzer {
  if (!_sentimentAnalyzer) {
    _sentimentAnalyzer = new SentimentAnalyzer();
  }
  return _sentimentAnalyzer;
}
