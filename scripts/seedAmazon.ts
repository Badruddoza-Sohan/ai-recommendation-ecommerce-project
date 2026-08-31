import { getDb } from "../api/queries/connection";
import { categories, products, productImages, sellers, productVariants, inventory } from "../db/schema";
import { sql } from "@db/mysql";
import * as dotenv from "dotenv";

dotenv.config();

const AMAZON_CATEGORIES = [
  "Electronics", "Computers", "Smart Home", "Arts & Crafts",
  "Automotive", "Baby", "Beauty and Personal Care", "Women's Fashion",
  "Men's Fashion", "Girls' Fashion", "Boys' Fashion", "Health and Household",
  "Home and Kitchen", "Industrial and Scientific", "Luggage",
  "Movies & Television", "Pet Supplies", "Software",
  "Sports and Outdoors", "Tools & Home Improvement", "Toys and Games",
  "Video Games", "Grocery", "Musical Instruments", "Office Products", "Books"
];

function generateSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function run() {
  console.log("Starting Amazon-scale seeding...");
  const db = getDb();

  // Ensure we have a default seller
  let sellerResult = await db.select().from(sellers).limit(1);
  let sellerId = 1;
  if (sellerResult.length === 0) {
    const s = await db.insert(sellers).values({
      userId: 1,
      businessName: "Global Retailers Ltd",
      storeName: "Global Retailers",
      storeDescription: "All your needs in one place.",
      contactPhone: "+8801700000000",
      contactEmail: "contact@globalretail.com",
      status: "approved",
      address: "Dhaka",
      city: "Dhaka",
      postalCode: "1200",
      country: "Bangladesh",
      logo: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=200",
    });
    sellerId = Number(s[0].insertId);
  } else {
    sellerId = sellerResult[0].id;
  }

  console.log("Seeding 26 categories...");
  const categoryIdMap = new Map<string, number>();

  for (const cat of AMAZON_CATEGORIES) {
    const slug = generateSlug(cat);
    const existing = await db.select().from(categories).where(sql`slug = ${slug}`).limit(1);
    if (existing.length === 0) {
      const inserted = await db.insert(categories).values({
        name: cat,
        slug,
        description: `Explore the best of ${cat}.`,
        imageUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400`,
      });
      categoryIdMap.set(cat, Number(inserted[0].insertId));
    } else {
      categoryIdMap.set(cat, existing[0].id);
    }
  }

  console.log("Categories seeded.");
  console.log("Seeding products...");

  let productCount = 0;

  for (const cat of AMAZON_CATEGORIES) {
    const catId = categoryIdMap.get(cat);
    if (!catId) continue;

    for (let i = 1; i <= 5; i++) {
      const pName = `Premium ${cat} Item ${i}`;
      const pSlug = generateSlug(pName) + "-" + Date.now().toString().slice(-4) + i;
      const price = Math.floor(Math.random() * 5000) + 500;
      
      const insertedP = await db.insert(products).values({
        sellerId,
        categoryId: catId,
        name: pName,
        slug: pSlug,
        description: `This is a high quality ${cat} item. Designed to be durable and aesthetic.`,
        shortDescription: `Best ${cat} product on the market.`,
        price: price,
        comparePrice: price + 200,
        sku: `SKU-${cat.substring(0, 3).toUpperCase()}-${i}`,
        status: "published",
        isFeatured: i === 1 ? 1 : 0,
        rating: 4 + Math.random(),
        reviewCount: Math.floor(Math.random() * 100),
        attributes: JSON.stringify({ sizeType: "Universal" }),
      });
      
      const pId = Number(insertedP[0].insertId);

      // Add image
      await db.insert(productImages).values({
        productId: pId,
        imageUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600`,
        isPrimary: 1,
        sortOrder: 0
      });

      // Add variants
      await db.insert(productVariants).values({
        productId: pId,
        size: "Free Size",
        color: "#000000",
        quantity: 50,
      });

      // Add inventory
      await db.insert(inventory).values({
        productId: pId,
        quantity: 50,
        location: "Main Warehouse",
      });

      productCount++;
    }
  }

  console.log(`Successfully seeded ${productCount} products across ${AMAZON_CATEGORIES.length} categories.`);
  process.exit(0);
}

run().catch(console.error);
