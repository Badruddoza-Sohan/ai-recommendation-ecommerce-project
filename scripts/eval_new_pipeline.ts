import "dotenv/config";
import { getQueryUnderstandingEngine } from "../server/ai/understanding/query-understanding.ts";
import { getCatalogSearchEngine } from "../server/ai/product/catalog-search.ts";

async function runTests() {
  console.log("Starting Evaluation of New AI Pipeline...");

  const queries = [
    { text: "I have a white shirt, suggest me some pants but no black", domain: "fashion" },
    { text: "need shoes for a wedding under 5000", domain: "fashion" },
    { text: "I want a laptop for video editing under 150000", domain: "electronics" },
    { text: "suggest a gaming monitor", domain: "electronics" },
    { text: "i have a white shirt wwhat will go with this for weeding", domain: "fashion" },
    { text: "I want to buy a laptop", domain: "electronics" },
    { text: "I want to build a gaming PC", domain: "electronics" }
  ];

  const understandingEngine = getQueryUnderstandingEngine();
  const { FashionRecommender } = await import("../server/ai/recommendation/fashion-recommender.ts");
  const { LaptopRecommender } = await import("../server/ai/recommendation/laptop-recommender.ts");
  const fashionRecommender = new FashionRecommender();
  const laptopRecommender = new LaptopRecommender();

  for (const q of queries) {
    console.log(`\n--- Test Query: "${q.text}" ---`);
    const intent = await understandingEngine.parseIntent(q.text, []);
    console.log("Extracted Intent:", JSON.stringify(intent, null, 2));

    let result;
    if (q.domain === "fashion") {
      result = await fashionRecommender.recommend(intent, []);
    } else {
      result = await laptopRecommender.recommend(intent, []);
    }

    console.log(`Recommendation Output Type: ${result.type}`);
    console.log(`Content:\n${result.content}`);
    if (result.products && result.products.length > 0) {
      console.log(`Included Products: ${result.products.map(p => p.name).join(", ")}`);
    }
  }
}

runTests().catch(console.error);
