import { getDb } from "../api/queries/connection";
import { products } from "../db/schema";
import { getVectorStore } from "../server/ai/embeddings/vector-store";
import { getEmbeddingService } from "../server/ai/embeddings/embedding-service";

async function main() {
  console.log("⚡ Auto-embedding Product Catalog into Vector Store...");
  const db = getDb();
  const vectorStore = getVectorStore();
  const embedder = getEmbeddingService();

  const allProducts = await db.select().from(products);
  console.log(`Found ${allProducts.length} catalog products to index.`);

  let indexedCount = 0;
  for (const prod of allProducts) {
    const textToEmbed = `${prod.name}. ${prod.shortDescription || prod.description || ""}. Price: ৳${prod.price}. Category: ${prod.tags || "Fashion"}`;
    const embedding = await embedder.embed(textToEmbed);

    await vectorStore.upsert("products", String(prod.id), embedding, {
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      price: prod.price,
      sku: prod.sku,
    });
    indexedCount++;
  }

  console.log(`🎉 Catalog Vector Auto-Sync Complete! Successfully indexed ${indexedCount} products.`);
}

main().catch(console.error);
