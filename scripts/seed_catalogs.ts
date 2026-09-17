import "dotenv/config";
import fs from "fs";
import path from "path";
import { getDb } from "../api/queries/connection.js";
import { products, productImages, categories, inventory, users, sellers } from "../db/schema.js";

async function run() {
  const db = getDb();
  console.log("Starting catalog seeding...");

  // 1. Ensure User exists
  let allUsers = await db.select().from(users);
  let userId = allUsers.length > 0 ? allUsers[0].id : null;
  if (!userId) {
    const res = await db.insert(users).values({
      unionId: "seed-user-" + Date.now(),
      name: "Seed User",
      email: "seed@marketverse.test",
      role: "customer"
    });
    userId = res[0].insertId;
    console.log("Created seed user with ID:", userId);
  }

  // 2. Ensure Seller exists
  let allSellers = await db.select().from(sellers);
  let sellerId = allSellers.length > 0 ? allSellers[0].id : null;
  if (!sellerId) {
    const res = await db.insert(sellers).values({
      userId: userId!,
      businessName: "MarketVerse Seed Store",
      businessEmail: "store@marketverse.test",
      status: "approved"
    });
    sellerId = res[0].insertId;
    console.log("Created seed seller with ID:", sellerId);
  }

  // 3. Ensure Categories exist
  let allCategories = await db.select().from(categories);
  const ensureCategory = async (name: string, slug: string) => {
    let cat = allCategories.find((c: any) => c.name === name);
    if (!cat) {
      const res = await db.insert(categories).values({
        name,
        slug,
        description: `Seed category for ${name}`,
        isActive: 1
      });
      cat = { id: res[0].insertId, name, slug } as any;
      console.log(`Created category: ${name}`);
    }
    return cat;
  };

  const electronicsCategory = await ensureCategory("Electronics", "electronics");
  const fashionCategory = await ensureCategory("Fashion", "fashion");
  const generalCategory = await ensureCategory("General", "general");

  // Helper to seed a dataset
  const seedDataset = async (filename: string, category: any, limit: number, fallbackPrice: number, placeholderText: string) => {
    const filepath = path.join(process.cwd(), "db/dataset/products", filename);
    if (!fs.existsSync(filepath)) {
      console.log(`Dataset not found: ${filepath}`);
      return;
    }
    const raw = fs.readFileSync(filepath, "utf-8");
    const catalog = JSON.parse(raw);
    console.log(`Loaded ${catalog.length} items from ${filename}.`);
    
    const toInsert = catalog.slice(0, limit);
    let count = 0;
    
    for (const item of toInsert) {
      try {
        const result = await db.insert(products).values({
          name: item.title,
          slug: (item.sku || `item-${count}`).toLowerCase() + "-" + Math.floor(Math.random() * 10000),
          description: `Synthetic product from catalog: ${item.title}`,
          shortDescription: item.subcategory || item.category || "",
          price: item.price_bdt || fallbackPrice,
          comparePrice: (item.price_bdt || fallbackPrice) * 1.2,
          sku: item.sku || `SKU-${Math.floor(Math.random() * 100000)}`,
          categoryId: category.id,
          sellerId: sellerId!,
          tags: item.search_keywords?.join(",") || "",
          attributes: JSON.stringify(item), // Dump the rest into attributes
          status: "active",
          isFeatured: Math.random() > 0.9 ? 1 : 0,
          isTrending: Math.random() > 0.9 ? 1 : 0,
          rating: item.rating || (3 + Math.random() * 2),
          reviewCount: Math.floor(Math.random() * 100),
          soldCount: Math.floor(Math.random() * 500)
        });

        const insertId = result[0].insertId;
        if (insertId) {
          await db.insert(productImages).values({
            productId: insertId,
            imageUrl: `https://placehold.co/600x400/png?text=${placeholderText}`,
            isPrimary: 1,
            sortOrder: 0
          });
          
          await db.insert(inventory).values({
            productId: insertId,
            quantity: Math.floor(Math.random() * 200) + 10,
            lowStockThreshold: 10,
            warehouseLocation: "Main Warehouse",
          });
          count++;
        }
      } catch (e: any) {
        // Silently skip duplicate slugs/skus or other errors for now to keep things fast
      }
    }
    console.log(`Seeded ${count} items into ${category.name}.`);
  };

  // Seed up to 500 from each
  await seedDataset("electronics_catalog.json", electronicsCategory, 500, 5000, "Electronic+Product");
  await seedDataset("fashion_catalog.json", fashionCategory, 500, 1500, "Fashion+Product");
  await seedDataset("general_catalog.json", generalCategory, 500, 1000, "General+Product");
  
  console.log("Seeding complete.");
  process.exit(0);
}

run().catch(console.error);
