import { UserIntent } from "../understanding/schemas.ts";
import { getCatalogSearchEngine } from "../product/catalog-search.ts";
import { getLLMGatewayProvider } from "../providers/llm-gateway-provider.ts";

export class LaptopRecommender {
  private searchEngine = getCatalogSearchEngine();
  private llm = getLLMGatewayProvider();

  async recommend(intent: UserIntent, chatHistory: { role: string; content: string }[]) {
    // 1. Check for missing constraints for electronics (e.g. use case, budget)
    // Enforce Guided Q&A: If the user hasn't specified their core needs, we must probe step-by-step.
    const hasBudget = !!intent.budget;
    const hasUseCase = !!intent.style;
    const alreadyAsked = chatHistory.some(m => m.role === "assistant" && m.content.includes("?") && !m.content.includes("How can I help you today"));
    
    if (intent.targetItems.length > 0 && (!hasBudget || !hasUseCase) && !alreadyAsked) {
      const { LAPTOP_USE_CASES, PRACTICAL_BASELINES, PC_COMPATIBILITY_RULES } = await import("../consultation/pc-knowledge-base.ts");
      const prompt = `
You are a tech specialist following a strict Guided Q&A framework.
The user wants: ${intent.targetItems.join(", ")}.

GUIDED Q&A RULES:
1. General Laptop: Ask Use case (e.g., Programming, Video Editing, General) -> Ask Budget -> Ask Portability vs Performance preference.
2. Gaming Laptop: Ask what Games they play -> Target Resolution (1080p/1440p) -> Target FPS -> Budget.
3. Video Editing: Ask 1080p vs 4K -> Software (Premiere, DaVinci) -> Budget.
4. PC Build: Ask Use case -> Budget -> Resolution -> Performance priority.

KNOWLEDGE BASE:
- Use Cases: ${JSON.stringify(LAPTOP_USE_CASES)}
- Baselines: ${JSON.stringify(PRACTICAL_BASELINES)}
- PC Compatibility: ${JSON.stringify(PC_COMPATIBILITY_RULES)}

Based on what the user has already provided, ask EXACTLY ONE natural probing question (in English or Banglish) to collect the NEXT required piece of information according to the rules above. DO NOT give recommendations yet.
`;
      const response = await this.llm.generate([{ role: "user", content: prompt }]);
      return { type: "question", content: response, products: [] };
    }

    // 2. Search catalog
    const keywords = [...intent.targetItems];
    if (intent.style) keywords.push(intent.style); // e.g. "gaming"
    
    const products = await this.searchEngine.search({
      keywords: keywords,
      excludedKeywords: intent.excludedPreferences,
      maxPrice: intent.budget || undefined,
      category: "electronics",
      limit: 4
    });

    if (products.length === 0) {
      return { 
        type: "no_results", 
        content: "I couldn't find any laptops or components matching your exact criteria. Can we adjust the budget or specifications?",
        products: [] 
      };
    }

    // 3. Generate response referencing actual products
    const productContext = products.map(p => {
      // Safely parse attributes for PC specs
      const attrs = typeof p.attributes === 'string' ? JSON.parse(p.attributes || "{}") : (p.attributes || {});
      const specs = attrs.use_cases ? `(Specs: ${attrs.use_cases.join(", ")})` : "";
      return `- ${p.name} (Price: ${p.price} BDT) [ID: ${p.id}] ${specs}`;
    }).join("\n");

    const recommendationPrompt = `
You are a helpful tech specialist. The user requested: ${intent.targetItems.join(", ")}.
Use Case/Style: ${intent.style || "Not specified"}.
Budget: ${intent.budget ? `${intent.budget} BDT` : "Not specified"}.
Excluded: ${intent.excludedPreferences.join(", ")}.

I found the following items in stock:
${productContext}

Write a natural, engaging recommendation referencing these specific items. Explain why they fit the user's use case (e.g. gaming, editing). Do NOT invent products.
CRITICAL INSTRUCTION: Always include a brief section outlining the recommended ideal specs (CPU, RAM, GPU, Display) and key considerations for the user's use case (${intent.style || "general use"}). Do this even if you only found accessories in stock, so the user knows what specs to look for when they buy the main device elsewhere. Keep it concise.
`;

    const recommendationText = await this.llm.generate([
      { role: "system", content: "You are a tech shopping assistant. Keep responses under 3 paragraphs." },
      { role: "user", content: recommendationPrompt }
    ]);

    return { type: "recommendation", content: recommendationText, products };
  }
}

let instance: LaptopRecommender;
export function getLaptopRecommender() {
  if (!instance) {
    instance = new LaptopRecommender();
  }
  return instance;
}
