import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BATCH_SIZE = 50; // Number of examples to generate per request
const TOTAL_BATCHES = 10; // Total batches to run
const OUTPUT_FILE = path.join(__dirname, '..', 'db', 'synthetic_corpus.json');

const PROMPT = `You are an expert training data generator for an AI e-commerce assistant.
Generate ${BATCH_SIZE} highly varied, human-like customer queries for a fashion and e-commerce platform.
Make them realistic: include typos, slang, informal phrasing, run-on sentences, and complex multi-part questions, just like real users type in a chat.

Include a mix of the following domains and labels:
- domain: "support"
  labels: "greeting", "goodbye", "order_status", "refund_policy", "shipping_info", "human_escalation", "complaint", "unknown"
- domain: "fashion"
  labels: "outfit_recommendation", "color_matching", "seasonal_trends", "occasion_styling", "style_guidance", "unknown"

Return ONLY a valid JSON array of objects. No markdown, no introduction.
Example format:
[
  { "domain": "support", "label": "order_status", "text": "hey where is my stuff?? i ordered it like 3 days ago" },
  { "domain": "fashion", "label": "occasion_styling", "text": "need smth to wear for my bros wedding next week, its outdoors" },
  { "domain": "support", "label": "human_escalation", "text": "let me talk to a real person this bot is useless" }
]`;

async function generateBatch(): Promise<any[]> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is missing.");
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // Groq's super fast Llama 3.1 model
      messages: [{ role: 'user', content: PROMPT }],
      temperature: 0.8,
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    // Strip potential markdown code blocks
    const cleanContent = content.replace(/^```json/m, '').replace(/^```/m, '').trim();
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error("Failed to parse JSON response:", content);
    return [];
  }
}

async function main() {
  if (!GROQ_API_KEY) {
    console.error("❌ Error: GROQ_API_KEY is not set.");
    console.log("Run this script like: set GROQ_API_KEY=your_key && npx tsx scripts/generate_training_data.ts");
    process.exit(1);
  }

  console.log(`🚀 Starting synthetic data generation... (${TOTAL_BATCHES} batches of ${BATCH_SIZE})`);
  
  let allExamples: any[] = [];
  
  // Try loading existing file
  try {
    const existing = await fs.readFile(OUTPUT_FILE, 'utf-8');
    allExamples = JSON.parse(existing);
    console.log(`Loaded ${allExamples.length} existing examples from ${OUTPUT_FILE}`);
  } catch (e) {
    // File doesn't exist yet
  }

  for (let i = 0; i < TOTAL_BATCHES; i++) {
    console.log(`Generating batch ${i + 1}/${TOTAL_BATCHES}...`);
    try {
      const examples = await generateBatch();
      if (examples && examples.length > 0) {
        allExamples.push(...examples);
        console.log(`✅ Generated ${examples.length} examples.`);
        // Save incrementally
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(allExamples, null, 2));
      }
    } catch (err) {
      console.error(`❌ Batch ${i + 1} failed:`, err);
    }
    
    // Slight delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`🎉 Finished! Total examples in corpus: ${allExamples.length}`);
  console.log(`Data saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
