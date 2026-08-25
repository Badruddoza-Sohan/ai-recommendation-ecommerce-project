import { getDb } from "../../../api/queries/connection.js";
import { supportLearning } from "../../../db/schema.js";

interface VerificationResult {
  isCorrect: boolean;
  correctedAnswer: string | null;
  reasoning: string;
}

export class OpenAIVerifier {
  private apiKey: string;
  private endpoint = "https://api.openai.com/v1/chat/completions";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    if (!this.apiKey) {
      console.warn("[OpenAIVerifier] Warning: OPENAI_API_KEY environment variable is not set.");
    }
  }

  /**
   * Verify the local AI's answer using OpenAI as a Judge.
   */
  async verifyResponse(
    query: string,
    localAnswer: string,
    systemContext: string,
    sessionId: string,
    domain: string
  ): Promise<VerificationResult> {
    try {
      const prompt = `You are an expert AI evaluator and verifier for an e-commerce assistant named Clevora AI.
Your job is to read a User Query, the Context provided to the local AI, and the Local AI's generated Answer.
Determine if the Local AI's answer is perfectly correct, helpful, and aligns with the context.

If it is correct, set "isCorrect" to true, and "correctedAnswer" to null.
If it is incorrect, hallucinates, or misses critical context, set "isCorrect" to false, and provide the perfect "correctedAnswer" that should be shown to the user instead.

User Query:
${query}

Context Given to Local AI:
${systemContext.slice(0, 2000)} // Truncated for safety

Local AI's Answer:
${localAnswer}

Output ONLY valid JSON with keys: "isCorrect" (boolean), "correctedAnswer" (string | null), "reasoning" (string).`;

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.1,
        })
      });

      if (!response.ok) {
        console.error(`[OpenAIVerifier] API Error: ${response.statusText}`);
        return { isCorrect: true, correctedAnswer: null, reasoning: "API Failed" }; // Pass-through on failure
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content) as VerificationResult;

      // CONTINUOUS LEARNING: Save to dataset if incorrect
      if (!parsed.isCorrect && parsed.correctedAnswer) {
        await this.saveToDataset(query, parsed.correctedAnswer, domain, sessionId);
      }

      return parsed;
    } catch (e) {
      console.error("[OpenAIVerifier] Verification failed:", e);
      return { isCorrect: true, correctedAnswer: null, reasoning: "Exception" }; // Pass-through
    }
  }

  private async saveToDataset(query: string, correctedAnswer: string, domain: string, sessionId: string) {
    try {
      const db = getDb();
      await db.insert(supportLearning).values({
        question: query,
        answer: correctedAnswer,
        category: domain,
        feedback: "corrected_by_openai",
        confidence: 1.0,
        sessionId: sessionId,
      });
      console.log(`[ContinuousLearning] Saved OpenAI correction for query: "${query}"`);
    } catch (e) {
      console.error("[ContinuousLearning] Failed to save correction:", e);
    }
  }
}

let _verifier: OpenAIVerifier | null = null;
export function getOpenAIVerifier(): OpenAIVerifier {
  if (!_verifier) _verifier = new OpenAIVerifier();
  return _verifier;
}
