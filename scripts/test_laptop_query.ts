import { getQueryUnderstandingEngine } from "../server/ai/understanding/query-understanding.ts";
import { getLaptopRecommender } from "../server/ai/recommendation/laptop-recommender.ts";

async function run() {
  const engine = getQueryUnderstandingEngine();
  const recommender = getLaptopRecommender();

  const query = "Suggest a laptop for HD Video Editing with budget 80k - 120k BDT. Include recommended specs and key considerations.";
  
  const intent = await engine.parseIntent(query, []);
  console.log("Extracted Intent:", JSON.stringify(intent, null, 2));

  const result = await recommender.recommend(intent, []);
  console.log("Recommendation Output Type:", result.type);
  console.log("Content:\n" + result.content);
}

run().catch(console.error);
