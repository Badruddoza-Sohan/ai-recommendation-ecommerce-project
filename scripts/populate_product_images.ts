import { getDb } from "../api/queries/connection.ts";
import * as schema from "../db/schema.ts";

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500",
  "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500",
  "https://images.unsplash.com/photo-1503602642458-232111445657?w=500",
];

async function populateProductImages() {
  console.log("🖼️ Populating high-speed primary product images for all catalog items...");
  const db = getDb();
  const startTime = Date.now();

  const allProducts = await db.select({ id: schema.products.id }).from(schema.products);
  const existingImages = await db.select({ productId: schema.productImages.productId }).from(schema.productImages);
  const existingProductIds = new Set(existingImages.map((img: any) => img.productId));

  const missingProducts = allProducts.filter((p: any) => !existingProductIds.has(p.id));
  console.log(`Found ${missingProducts.length.toLocaleString()} products missing primary images.`);

  if (missingProducts.length === 0) {
    console.log("✅ All products already have primary images!");
    return;
  }

  const BATCH_SIZE = 1000;
  let batch: any[] = [];
  let count = 0;

  for (let i = 0; i < missingProducts.length; i++) {
    const p = missingProducts[i];
    const imgUrl = SAMPLE_IMAGES[i % SAMPLE_IMAGES.length];

    batch.push({
      productId: p.id,
      imageUrl: imgUrl,
      isPrimary: 1,
      sortOrder: 0,
    });

    if (batch.length >= BATCH_SIZE) {
      await db.insert(schema.productImages).values(batch);
      count += batch.length;
      console.log(`  ✓ Populated images for ${count.toLocaleString()} / ${missingProducts.length.toLocaleString()} products...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.insert(schema.productImages).values(batch);
    count += batch.length;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🎉 SUCCESS! Populated primary images for ${count.toLocaleString()} products in ${durationSec}s!`);
}

populateProductImages().catch((err) => {
  console.error("❌ Failed to populate images:", err);
  process.exit(1);
});
