import fs from "fs";
import path from "path";
import { getDb } from "../api/queries/connection.js";
import { products, supportKnowledge, categories, sellers } from "../db/schema.js";

const DATASET_DIR = path.join(process.cwd(), "db", "dataset");

async function ingestQA(filename: string, source: string) {
  const filePath = path.join(DATASET_DIR, "qa", filename);
  if (!fs.existsSync(filePath)) {
    console.log(`[Ingest] Skipping ${filename} - not found.`);
    return;
  }

  console.log(`[Ingest] Reading ${filename}...`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`[Ingest] Parsed ${data.length} entries for ${filename}. Inserting in batches...`);

  const db = getDb();
  
  // Clean up old synthetic data
  // await db.delete(supportKnowledge).where(sql`source = 'imported'`); // Optional

  const batchSize = 1000;
  let inserted = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const insertData = batch.map((item: any) => ({
      question: item.question,
      answer: item.reply,
      category: item.category,
      keywords: (item.keywords || []).join(", "),
      isActive: 1,
      source: "imported",
    }));

    await db.insert(supportKnowledge).values(insertData);
    inserted += insertData.length;
    if (inserted % 10000 === 0) {
      console.log(`[Ingest] Inserted ${inserted}/${data.length} QA entries...`);
    }
  }
  
  console.log(`[Ingest] Finished ${filename} -> ${inserted} entries.\n`);
}

async function ingestCatalog(filename: string) {
  const filePath = path.join(DATASET_DIR, "products", filename);
  if (!fs.existsSync(filePath)) {
    console.log(`[Ingest] Skipping ${filename} - not found.`);
    return;
  }

  console.log(`[Ingest] Reading ${filename}...`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`[Ingest] Parsed ${data.length} products for ${filename}. Inserting in batches...`);

  const db = getDb();

  const batchSize = 1000;
  let inserted = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const insertData = batch.map((item: any, idx: number) => {
      // Use fallback defaults for required fields
      const name = item.title || item.name || "Product";
      const slug = (item.sku || `sku-${Date.now()}-${i+idx}`).toLowerCase().replace(/\s+/g, '-');
      return {
        name,
        slug,
        description: item.description || name,
        price: Number(item.price_bdt) || Number(item.price) || 1000,
        sku: item.sku || `sku-${Date.now()}-${i+idx}`,
        categoryId: 1, // Fallback Category ID (assuming seeded ID=1 exists)
        sellerId: 1, // Fallback Seller ID (assuming seeded ID=1 exists)
        status: "active",
        tags: (item.search_keywords || []).join(", ")
      };
    });

    try {
      await db.insert(products).values(insertData);
      inserted += insertData.length;
    } catch (e: any) {
      console.error(`[Ingest] Batch insert failed: ${e.message}`);
    }

    if (inserted % 10000 === 0) {
      console.log(`[Ingest] Inserted ${inserted}/${data.length} Product entries...`);
    }
  }

  console.log(`[Ingest] Finished ${filename} -> ${inserted} entries.\n`);
}

async function main() {
  console.log("==========================================");
  console.log("  CLEVORA AI - BATCH INGESTION PIPELINE   ");
  console.log("==========================================\n");

  // Ingest QA Files
  await ingestQA("gadgets_qa.json", "gadgets");
  await ingestQA("general_qa.json", "general");
  await ingestQA("fashion_qa.json", "fashion");
  await ingestQA("support_qa.json", "support");

  // Ingest Catalog Files
  await ingestCatalog("electronics_catalog.json");
  await ingestCatalog("general_catalog.json");
  await ingestCatalog("fashion_catalog.json");

  console.log("[Success] All datasets ingested into SQLite.");
}

main().catch(console.error);
