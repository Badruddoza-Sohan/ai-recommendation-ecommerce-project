import { UserIntent } from "../understanding/schemas.ts";
import { getCatalogSearchEngine } from "../product/catalog-search.ts";
import { getLLMGatewayProvider } from "../providers/llm-gateway-provider.ts";

export class FashionRecommender {
  private searchEngine = getCatalogSearchEngine();
  private llm = getLLMGatewayProvider();

  async recommend(intent: UserIntent, chatHistory: { role: string; content: string }[]) {
    // 1. Check if we need more info (Progressive Q&A)
    // Enforce Guided Q&A: If the user wants an item but hasn't picked a specific color or constraint yet.
    // E.g., if they just say "I want pants" or "What goes with this", we must give options first.
    // If they said "I want black pants", excludedPreferences or style might capture it, but ideally we check if they gave a specific descriptor.
    // For now, if there is a target item and NO budget or strict constraints, we initiate the Consultation Gate.
    if (intent.targetItems.length > 0 && intent.excludedPreferences.length === 0 && !intent.budget && !chatHistory.some(m => m.role === "assistant" && m.content.includes("Option"))) {
      // Just a simple item requested without constraints, we should probe.
      const { SHIRT_TO_PANT_RULES, SHOES_MATCHING_RULES, WATCH_MATCHING_RULES } = await import("../consultation/fashion-knowledge-base.ts");
      
      const prompt = `
You are a fashion stylist following strict guided consultation rules.
The user wants: ${intent.targetItems.join(", ")}.
They already have: ${intent.ownedItems.join(", ")}.

STRICT GUIDED Q&A RULES:
1. If they have a shirt and want pants: Ask for pant color preference. Suggest 3-4 suitable pant colors based on the Shirt->Pant matching knowledge below.
2. If they have a pant and want a shirt: Ask if they want a formal or casual look, then suggest 3-4 suitable shirt colors.
3. If they want shoes: Determine formality (or ask), then suggest shoe styles/colors based on the rules below.
4. If they want a watch: Suggest 3-4 watch options based on the rules below.

FASHION KNOWLEDGE:
- Shirt to Pant Matches: ${JSON.stringify(SHIRT_TO_PANT_RULES)}
- Shoes Matching: ${JSON.stringify(SHOES_MATCHING_RULES)}
- Watch Matching: ${JSON.stringify(WATCH_MATCHING_RULES)}

Generate ONE short, natural probing question (in English or Banglish as appropriate) asking the user to choose from the recommended options based on the rules. Do not ask for multiple things at once.
`;
      const response = await this.llm.generate([{ role: "user", content: prompt }]);
      return { type: "question", content: response, products: [] };
    }

    // 2. Perform catalog search based on intent
    const keywords = [...intent.targetItems];
    if (intent.style) keywords.push(intent.style);
    
    // We add owned items into the context so the AI can match, but we don't strictly search for them.
    
    const products = await this.searchEngine.search({
      keywords: keywords,
      excludedKeywords: intent.excludedPreferences,
      maxPrice: intent.budget || undefined,
      category: "fashion",
      limit: 4
    });

    if (products.length === 0) {
      return { 
        type: "no_results", 
        content: "I couldn't find any items matching your exact preferences. Could we try adjusting the style or budget?",
        products: [] 
      };
    }

    // 3. Generate response referencing the actual products found
    const productContext = products.map(p => `- ${p.name} (Price: ${p.price} BDT) [ID: ${p.id}]`).join("\n");
    const recommendationPrompt = `
You are a helpful fashion stylist. The user requested: ${intent.targetItems.join(", ")}.
They already own: ${intent.ownedItems.join(", ")}.
Excluded preferences: ${intent.excludedPreferences.join(", ")}.

I have found the following items from our actual inventory:
${productContext}

Write a natural, engaging recommendation referencing these specific items and explaining why they match the user's request (e.g. how they complement what the user already owns). Do NOT invent products that aren't in the list above. Keep it concise.
`;

    const recommendationText = await this.llm.generate([
      { role: "system", content: "You are a shopping assistant. Keep responses under 3 paragraphs." },
      { role: "user", content: recommendationPrompt }
    ]);

    return { type: "recommendation", content: recommendationText, products };
  }
}

let instance: FashionRecommender;
export function getFashionRecommender() {
  if (!instance) {
    instance = new FashionRecommender();
  }
  return instance;
}
