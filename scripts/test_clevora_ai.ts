import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, "..", "clevora_test_report.json");
const CORPUS_FILE = path.join(__dirname, "..", "db", "synthetic_corpus.json");

async function main() {
  let questions: string[] = [];
  try {
    const corpusData = await fs.readFile(CORPUS_FILE, "utf-8");
    const corpus = JSON.parse(corpusData);
    questions = corpus.map((c: any) => c.text);
  } catch (e) {
    console.log("No synthetic corpus found. Using default dataset.");
    questions = [
      "i need a blue shirt",
      "where is my order",
      "talk to human",
      "buy shoes",
      "what's the return policy",
      "show me summer dresses",
      "open cart",
      "checkout now",
    ];
  }

  const TARGET_TESTS = 10000;
  console.log(`Starting automated test for ${TARGET_TESTS} questions...`);

  const testSet: string[] = [];
  for (let i = 0; i < TARGET_TESTS; i++) {
    testSet.push(questions[i % questions.length]);
  }

  const results: any[] = [];
  let successCount = 0;
  let fallbackCount = 0;
  let errorCount = 0;

  const CONCURRENCY = 3; 
  let currentIndex = 0;

  const processNext = async (): Promise<void> => {
    if (currentIndex >= testSet.length) return;
    const index = currentIndex++;
    const question = testSet[index];
    
    try {
      const start = Date.now();
      const res = await fetch("http://localhost:5173/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          sessionId: "test-session",
          domain: "support",
          context: { userIntent: "voice-assistant-command" }
        })
      });
      
      const latency = Date.now() - start;

      if (res.ok) {
        const data = await res.json();
        if (data?.data?.intent && data.data.intent !== "help") {
          successCount++;
          results.push({ question, success: true, latency, intent: data.data.intent });
        } else {
          fallbackCount++;
          results.push({ question, success: false, reason: "Fallback", latency });
        }
      } else {
        errorCount++;
        results.push({ question, success: false, error: "HTTP " + res.status, latency });
      }
    } catch (e: any) {
      errorCount++;
      results.push({ question, success: false, error: e.message, latency: 0 });
    }

    if (index % 100 === 0 && index > 0) {
      console.log(`Progress: ${index}/${TARGET_TESTS} | Success: ${successCount} | Fallbacks: ${fallbackCount} | Errors: ${errorCount}`);
      await fs.writeFile(OUTPUT_FILE, JSON.stringify({
        totalRun: index,
        successCount,
        fallbackCount,
        errorCount,
      }, null, 2));
    }

    // delay to prevent massive rate limits
    await new Promise(r => setTimeout(r, 500));
    await processNext();
  };

  const workers = Array(CONCURRENCY).fill(null).map(() => processNext());
  await Promise.all(workers);

  console.log("Test Complete.");
  console.log(`Final Results: Success: ${successCount}, Fallbacks: ${fallbackCount}, Errors: ${errorCount}`);

  await fs.writeFile(OUTPUT_FILE, JSON.stringify({
    totalRun: testSet.length,
    successCount,
    fallbackCount,
    errorCount,
    sampleResults: results.slice(0, 50)
  }, null, 2));
}

main().catch(console.error);
