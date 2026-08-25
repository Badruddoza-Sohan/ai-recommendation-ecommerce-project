import { IntentClassifier } from "../server/ai/classification/intent-classifier.ts";

async function main() {
  console.log("⚡ Re-indexing and training ML Intent Classifier...");
  const classifier = new IntentClassifier();
  await classifier.initialize();
  console.log("✅ ML Intent Classifier successfully trained and re-indexed!");
}

main().catch(console.error);
