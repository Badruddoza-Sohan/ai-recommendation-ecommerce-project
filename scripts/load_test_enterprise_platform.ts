import { getEnterpriseRanker, ProductCandidate } from "../server/ai/ranking/enterprise-ranker.ts";
import { getSecurityGuardrails } from "../server/ai/security/security-guardrails.ts";
import { getABTestingEngine } from "../server/ai/ab-testing/ab-testing-engine.ts";
import { getExplainableAIModule } from "../server/ai/explainability/explainable-ai.ts";

// Synthetic product catalog
const mockCatalog: ProductCandidate[] = [
  { id: 101, name: "Navy Silk Panjabi", price: 4800, category: "Panjabi", color: "Navy", fabric: "Silk Blend", stock_quantity: 15, rating: 4.8, sold_count: 320, tags: ["holud", "eid", "traditional"] },
  { id: 102, name: "White Pajama", price: 1200, category: "Pajama", color: "White", fabric: "Cotton", stock_quantity: 45, rating: 4.6, sold_count: 510, tags: ["holud", "eid", "traditional"] },
  { id: 103, name: "Turmeric Yellow Panjabi", price: 3500, category: "Panjabi", color: "Yellow", fabric: "Cotton", stock_quantity: 0, rating: 4.5, sold_count: 120, tags: ["holud", "traditional"] },
  { id: 104, name: "Handcrafted Leather Nagra", price: 2900, category: "Shoes", color: "Brown", stock_quantity: 20, rating: 4.9, sold_count: 410, tags: ["traditional", "shoes"] },
  { id: 105, name: "Cream Cotton Panjabi", price: 3200, category: "Panjabi", color: "Cream", fabric: "Cotton", stock_quantity: 12, rating: 4.7, sold_count: 230, tags: ["eid", "traditional"] },
];

async function runLoadTest(concurrentUsers = 100, requestsPerUser = 10) {
  console.log(`⚡ Starting High-Concurrency Enterprise Load Test...`);
  console.log(` 👥 Concurrent Virtual Users: ${concurrentUsers}`);
  console.log(` 🔄 Requests per User: ${requestsPerUser}`);
  console.log(` 📦 Total Synthetic API Transactions: ${concurrentUsers * requestsPerUser}`);

  const ranker = getEnterpriseRanker();
  const guardrails = getSecurityGuardrails();
  const abEngine = getABTestingEngine();
  const explainable = getExplainableAIModule();

  const latencies: number[] = [];
  let totalSuccessful = 0;
  let totalBlocked = 0;

  const startTime = Date.now();

  const tasks: Array<Promise<void>> = [];

  for (let u = 0; u < concurrentUsers; u++) {
    const userId = `user-${u}`;

    const userTask = (async () => {
      for (let r = 0; r < requestsPerUser; r++) {
        const reqStart = Date.now();
        const sessionId = `session-${userId}-${r}`;

        // 1. Security Check
        const secRes = guardrails.validateInput(`I need an outfit for Holud user ${u}`, `192.168.1.${u}`);
        if (!secRes.allowed) {
          totalBlocked++;
          continue;
        }

        // 2. A/B Variant Assignment
        const variant = abEngine.getVariant(sessionId);

        // 3. Multi-Factor Ranking
        const ranked = ranker.rankProducts(mockCatalog, {
          occasion: "Holud",
          avoid_colors: ["Yellow"],
          preferred_colors: ["Navy"],
          owned_items: ["White Pajama"],
        });

        // 4. Rationale Generation
        if (ranked.length > 0) {
          explainable.generateRationale({
            occasion: "Holud",
            preferredColor: "Navy",
            ownedItem: "White Pajama",
            productName: ranked[0].name,
            fabric: ranked[0].fabric,
          });
        }

        const duration = Date.now() - reqStart;
        latencies.push(duration);
        totalSuccessful++;
      }
    })();

    tasks.push(userTask);
  }

  await Promise.all(tasks);

  const totalDurationSeconds = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.90)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = (totalSuccessful / totalDurationSeconds).toFixed(2);

  console.log(`\n🎉 HIGH-CONCURRENCY LOAD TEST COMPLETED!`);
  console.log(` ⏱️  Total Duration: ${totalDurationSeconds.toFixed(2)}s`);
  console.log(` 🚀 Throughput: ${rps} Requests / Second (RPS)`);
  console.log(` 📊 Latency Metrics:`);
  console.log(`    - p50 Latency: ${p50} ms`);
  console.log(`    - p90 Latency: ${p90} ms`);
  console.log(`    - p99 Latency: ${p99} ms`);
  console.log(` ✅ Successful Transactions: ${totalSuccessful}`);
  console.log(` 🛡️ Security Rate-Limited / Blocked: ${totalBlocked}`);
}

runLoadTest().catch(console.error);
