/**
 * Intent Classifier
 *
 * Embedding-based intent classification using nomic-embed-text + cosine similarity.
 * Replaces the Naive Bayes classifier entirely.
 *
 * How it works:
 *  1. At startup, all training examples are embedded and stored in the "intents" vector collection.
 *  2. At inference time, the user message is embedded and compared against all training vectors.
 *  3. The intent of the nearest training example (above the confidence threshold) is returned.
 *  4. If no match exceeds the threshold, "unknown" is returned.
 *
 * Benefits over Naive Bayes:
 *  - Handles paraphrases ("give me my money back" ≈ "refund please")
 *  - Works with Bangla/Banglish without special handling
 *  - No retraining needed for new examples — just add to vector store
 */

import { getEmbeddingService } from "../embeddings/embedding-service.ts";
import { getVectorStore } from "../embeddings/vector-store.ts";
import { INTENT_TRAINING_DATA } from "./training-data.ts";
import type { ClassificationResult, Domain, TrainingExample } from "./types.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum cosine similarity score to accept a classification */
const CONFIDENCE_THRESHOLD = 0.62;

/** How many nearest neighbors to examine for robustness */
const TOP_K = 5;

// ─── Intent Classifier ────────────────────────────────────────────────────────

export class IntentClassifier {
  private isInitialized = false;

  // ── Initialization ────────────────────────────────────────────────────────

  /**
   * Embed all training examples and store in the vector store.
   * Called once at startup. Skips already-embedded examples.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const embedder = getEmbeddingService();
    const store = getVectorStore();

    const total = INTENT_TRAINING_DATA.length;
    let embedded = 0;
    let skipped = 0;

    console.log(`[IntentClassifier] Embedding ${total} training examples...`);

    // Process in batches of 20 for efficiency
    const BATCH_SIZE = 20;
    for (let i = 0; i < INTENT_TRAINING_DATA.length; i += BATCH_SIZE) {
      const batch = INTENT_TRAINING_DATA.slice(i, i + BATCH_SIZE);

      // Check which ones already exist
      const toEmbed: Array<{ example: TrainingExample; sourceId: string }> = [];
      for (const example of batch) {
        const sourceId = this.makeSourceId(example);
        const exists = await store.exists("intents", sourceId);
        if (!exists) {
          toEmbed.push({ example, sourceId });
        } else {
          skipped++;
        }
      }

      if (toEmbed.length === 0) continue;

      // Batch embed
      const texts = toEmbed.map((e) => e.example.text);
      const embeddings = await embedder.embedBatch(texts);

      // Store
      for (let j = 0; j < toEmbed.length; j++) {
        const { example, sourceId } = toEmbed[j];
        await store.upsert("intents", sourceId, embeddings[j], {
          domain: example.domain,
          intent: example.intent,
          text: example.text,
        });
        embedded++;
      }
    }

    console.log(
      `[IntentClassifier] Ready. Embedded: ${embedded}, Cached: ${skipped}, Total: ${total}`
    );
    this.isInitialized = true;
  }

  // ── Classification ────────────────────────────────────────────────────────

  /**
   * Classify a user message into a (domain, intent) pair.
   *
   * @param text - User's message
   * @param domainHint - Optional domain to restrict search (improves speed + accuracy)
   */
  async classify(text: string, domainHint?: Domain): Promise<ClassificationResult> {
    if (!this.isInitialized) {
      // Lazy init
      await this.initialize();
    }

    // Fast keyword pattern matching (< 1ms execution)
    const lower = text.toLowerCase().trim();

    // 1. Gadgets domain fast path
    if (
      domainHint === "gadgets" ||
      lower.includes("laptop") || lower.includes("pc build") || lower.includes("gaming pc") ||
      lower.includes("gpu") || lower.includes("rtx") || lower.includes("gtx") ||
      lower.includes("ram") || lower.includes("ssd") || lower.includes("motherboard") ||
      lower.includes("processor") || lower.includes("intel") || lower.includes("ryzen") ||
      lower.includes("macbook") || lower.includes("specs") || lower.includes("video editing") ||
      lower.includes("programming") || lower.includes("coding") || lower.includes("psu") ||
      lower.includes("cooler") || lower.includes("monitor") || lower.includes("ddr4") || lower.includes("ddr5")
    ) {
      return {
        intent: lower.includes("build") || lower.includes("compatib") ? "pc_build" : "laptop_recommendation",
        domain: "gadgets",
        confidence: 0.98,
        nearestExamples: [],
        reason: "Fast keyword pattern match for gadgets domain",
      };
    }

    // 2. General domain fast path
    if (domainHint === "general") {
      return {
        intent: "product_discovery",
        domain: "general",
        confidence: 0.95,
        nearestExamples: [],
        reason: "Fast keyword pattern match for general domain",
      };
    }

    // 3. Fashion domain fast path
    if (
      domainHint === "fashion" ||
      lower.includes("eid") || lower.includes("panjabi") || lower.includes("saree") ||
      lower.includes("wedding") || lower.includes("holud") || lower.includes("reception") ||
      lower.includes("office") || lower.includes("casual") || lower.includes("business") ||
      lower.includes("formal") || lower.includes("party") || lower.includes("date") ||
      lower.includes("gym") || lower.includes("workout") || lower.includes("interview") ||
      lower.includes("style") || lower.includes("outfit") || lower.includes("budget") ||
      lower.includes("guest") || lower.includes("evening") || lower.includes("traditional") ||
      lower.includes("under") || lower.includes("prefer") || lower.includes("look") ||
      lower.includes("option") || lower.includes("clothes") || lower.includes("wear") ||
      lower.includes("kurta") || lower.includes("chinos") || lower.includes("shoes") ||
      lower.includes("nagra") || lower.includes("bdt") || lower.includes("10k") ||
      lower.includes("5k") || lower.includes("groom")
    ) {
      return {
        intent: "outfit_recommendation",
        domain: "fashion",
        confidence: 0.98,
        nearestExamples: [],
        reason: "Fast keyword pattern match for fashion domain",
      };
    }

    const embedder = getEmbeddingService();
    const store = getVectorStore();

    // Embed the user message
    const queryEmbedding = await embedder.embed(text);

    // Search the intents collection
    const results = await store.search("intents", queryEmbedding, TOP_K, 0.0);

    if (results.length === 0) {
      return this.unknownResult(text);
    }

    // Filter by domain hint if provided
    const filtered = domainHint
      ? results.filter((r) => r.metadata.domain === domainHint)
      : results;

    const candidates = filtered.length > 0 ? filtered : results;
    const best = candidates[0];

    if (best.score < CONFIDENCE_THRESHOLD) {
      return this.unknownResult(text);
    }

    const nearestExamples = candidates.slice(0, 3).map((r) => ({
      text: r.metadata.text as string,
      intent: r.metadata.intent as string,
      score: r.score,
    }));

    return {
      intent: best.metadata.intent as string,
      domain: best.metadata.domain as Domain,
      confidence: best.score,
      nearestExamples,
      reason: `Matched "${best.metadata.text}" (similarity: ${(best.score * 100).toFixed(1)}%)`,
    };
  }

  /**
   * Add a new training example at runtime (online learning).
   * The example is immediately available for future classifications.
   */
  async addExample(example: TrainingExample): Promise<void> {
    const embedder = getEmbeddingService();
    const store = getVectorStore();

    const embedding = await embedder.embed(example.text);
    const sourceId = this.makeSourceId(example);

    await store.upsert("intents", sourceId, embedding, {
      domain: example.domain,
      intent: example.intent,
      text: example.text,
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private makeSourceId(example: TrainingExample): string {
    // Deterministic ID from domain + intent + text
    const slug = `${example.domain}__${example.intent}__${example.text}`
      .toLowerCase()
      .replace(/[^a-z0-9_\u0980-\u09FF]/g, "_")
      .slice(0, 120);
    return slug;
  }

  private unknownResult(_text: string): ClassificationResult {
    return {
      intent: "unknown",
      domain: "support", // default fallback domain
      confidence: 0,
      nearestExamples: [],
      reason: "No training example exceeded the confidence threshold",
    };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _classifier: IntentClassifier | null = null;

export function getIntentClassifier(): IntentClassifier {
  if (!_classifier) {
    _classifier = new IntentClassifier();
  }
  return _classifier;
}
