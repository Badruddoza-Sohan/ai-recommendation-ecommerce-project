import "dotenv/config";
import fs from "fs";
import path from "path";
import { getDb } from "../api/queries/connection.js";
import { products, productImages, categories, inventory, users, sellers } from "../db/schema.js";

const TARGET_CATEGORIES = [
  "Arts, Crafts & Sewing",
  "Automotive",
  "Baby",
  "Beauty & Personal Care",
  "Books",
  "Books & Media",
  "Electronics",
  "Fashion",
  "Food & Beverages",
  "General",
  "Grocery",
  "Health & Beauty",
  "Health & Household",
  "Home & Kitchen",
  "Home & Living",
  "Industrial & Scientific",
  "Jewelry & Watches",
  "Musical Instruments",
  "Office Products",
  "Pet Supplies",
  "Software",
  "Sports & Outdoors",
  "Tools & Home Improvement",
  "Toys & Games",
  "Toys & Kids",
  "Video Games"
];

async function run() {
  const db = getDb();
  console.log("Starting massive catalog seeding...");

  // 1. Ensure User exists
  let allUsers = await db.select().from(users);
  let userId = allUsers.length > 0 ? allUsers[0].id : null;
  if (!userId) {
    const res = await db.insert(users).values({
      unionId: "seed-user-mass-" + Date.now(),
      name: "Mass Seed User",
      email: "mass-seed@marketverse.test",
      role: "customer"
    });
    userId = res[0].insertId;
  }

  // 2. Ensure Seller exists
  let allSellers = await db.select().from(sellers);
  let sellerId = allSellers.length > 0 ? allSellers[0].id : null;
  if (!sellerId) {
    const res = await db.insert(sellers).values({
      userId: userId!,
      businessName: "MarketVerse Global Store",
      businessEmail: "global@marketverse.test",
      status: "approved"
    });
    sellerId = res[0].insertId;
  }

  // 3. Load Datasets
  const elecRaw = fs.readFileSync(path.join(process.cwd(), "db/dataset/products/electronics_catalog.json"), "utf-8");
  const fashRaw = fs.readFileSync(path.join(process.cwd(), "db/dataset/products/fashion_catalog.json"), "utf-8");
  const genRaw = fs.readFileSync(path.join(process.cwd(), "db/dataset/products/general_catalog.json"), "utf-8");
  
  const elecDataset = JSON.parse(elecRaw);
  const fashDataset = JSON.parse(fashRaw);
  const genDataset = JSON.parse(genRaw);
  
  let elecPointer = 1000; // offset to avoid dupes from previous runs
  let fashPointer = 1000;
  let genPointer = 1000;

  // 4. Ensure Categories & Seed Products
  let allCategories = await db.select().from(categories);
  
  for (const catName of TARGET_CATEGORIES) {
    let cat = allCategories.find((c: any) => c.name === catName);
    if (!cat) {
      const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const res = await db.insert(categories).values({
        name: catName,
        slug,
        description: `Everything you need in ${catName}`,
        isActive: 1
      });
      cat = { id: res[0].insertId, name: catName, slug } as any;
      console.log(`Created category: ${catName}`);
    }

    // Determine which dataset to pull from
    let datasetToUse;
    let pointer;
    const catLower = catName.toLowerCase();
    
    if (catLower.includes("electronic") || catLower.includes("video games") || catLower.includes("software")) {
      datasetToUse = elecDataset;
      pointer = elecPointer;
      elecPointer += 50;
    } else if (catLower.includes("fashion") || catLower.includes("jewelry")) {
      datasetToUse = fashDataset;
      pointer = fashPointer;
      fashPointer += 50;
    } else {
      datasetToUse = genDataset;
      pointer = genPointer;
      genPointer += 50;
    }

    const toInsert = datasetToUse.slice(pointer, pointer + 50);
    let count = 0;

    for (const item of toInsert) {
      try {
        const productSlug = (item.sku || `item-${catName}-${count}`).toLowerCase() + "-" + Math.floor(Math.random() * 100000);
        
        const result = await db.insert(products).values({
          name: item.title,
          slug: productSlug,
          description: `Synthetic product from catalog: ${item.title}`,
          shortDescription: item.subcategory || item.category || catName,
          price: item.price_bdt || Math.floor(Math.random() * 5000) + 500,
          comparePrice: (item.price_bdt || 5000) * 1.2,
          sku: item.sku || `SKU-${Math.floor(Math.random() * 100000)}`,
          categoryId: cat.id,
          sellerId: sellerId!,
          tags: item.search_keywords?.join(",") || "",
          attributes: JSON.stringify(item),
          status: "active",
          isFeatured: Math.random() > 0.9 ? 1 : 0,
          isTrending: Math.random() > 0.9 ? 1 : 0,
          rating: item.rating || (3 + Math.random() * 2),
          reviewCount: Math.floor(Math.random() * 100),
          soldCount: Math.floor(Math.random() * 500)
        });

        const insertId = result[0].insertId;
        if (insertId) {
          // Use Picsum for realistic images
          const imageSeed = productSlug.replace(/[^a-z0-9]/g, '');
          await db.insert(productImages).values({
            productId: insertId,
            imageUrl: `https://picsum.photos/seed/${imageSeed}/600/400`,
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
        // Skip dupes
      }
    }
    console.log(`Seeded ${count} items into ${catName}.`);
  }

  console.log("Mass seeding complete.");
  process.exit(0);
}

run().catch(console.error);
