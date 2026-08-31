import { getLLMGatewayProvider } from "../providers/llm-gateway-provider.ts";
import { UserIntent } from "./schemas.ts";

export class QueryUnderstandingEngine {
  private llm = getLLMGatewayProvider();

  async parseIntent(userMessage: string, chatHistory: { role: "user"|"assistant"|"system", content: string }[] = []): Promise<UserIntent> {
    const prompt = `
You are an intelligent shopping assistant for MarketVerse.
Your task is to parse the user's latest message and extract their shopping intent into JSON.

Context (Previous Messages):
${chatHistory.map(m => `${m.role}: ${m.content}`).join("\n")}

Latest User Message:
"${userMessage}"

Extract the following into a JSON object:
- ownedItems: Array of strings. Items the user explicitly states they already own (e.g. "I have a red shirt"). Do NOT include items they want to buy.
- targetItems: Array of strings. Items the user wants to buy or get recommendations for (e.g. "shoes", "pants"). If the user asks what goes well with an owned item but doesn't specify what they want (e.g. "what will go with this"), infer 1-2 complementary categories (e.g. "pants", "shoes", "blazer") and include them here.
- excludedPreferences: Array of strings. Things the user explicitly does NOT want (e.g. "no black", "not sneakers"). Pay close attention to negations.
- budget: Number or null. The budget limit in BDT if explicitly mentioned.
- style: String or null. The requested style, occasion, or use-case (e.g. "wedding", "gaming").
- additionalConstraints: Object (string to string) or null. Any extra technical requirements (e.g. {"resolution": "1080p", "software": "Premiere"}).

Example 1: "I have a white shirt, suggest me some pants but no black"
-> {"ownedItems":["white shirt"], "targetItems":["pants"], "excludedPreferences":["black"], "budget":null, "style":null, "additionalConstraints":null}

Example 2: "need shoes for a wedding under 5000"
-> {"ownedItems":[], "targetItems":["shoes"], "excludedPreferences":[], "budget":5000, "style":"wedding", "additionalConstraints":null}

Example 3: "laptop for video editing in 4k"
-> {"ownedItems":[], "targetItems":["laptop"], "excludedPreferences":[], "budget":null, "style":"video editing", "additionalConstraints":{"resolution":"4k"}}

Respond ONLY with the raw JSON object.
`;

    try {
      const result = await this.llm.generateJSON<UserIntent>([
        { role: "system", content: "You are a JSON parsing assistant." },
        { role: "user", content: prompt }
      ]);
      
      return {
        ownedItems: result.ownedItems || [],
        targetItems: result.targetItems || [],
        excludedPreferences: result.excludedPreferences || [],
        budget: result.budget || null,
        style: result.style || null,
        additionalConstraints: result.additionalConstraints || {},
      };
    } catch (error) {
      console.error("[QueryUnderstandingEngine] Error parsing intent:", error);
      // Fallback
      return {
        ownedItems: [],
        targetItems: [],
        excludedPreferences: [],
        budget: null,
        style: null,
        additionalConstraints: {}
      };
    }
  }
}

let instance: QueryUnderstandingEngine;
export function getQueryUnderstandingEngine() {
  if (!instance) {
    instance = new QueryUnderstandingEngine();
  }
  return instance;
}
