import "dotenv/config";
import { getDb } from "../api/queries/connection.js";
import { categories } from "../db/schema.js";

const amazonCategories = [
  "Home & Kitchen",
  "Books",
  "Beauty & Personal Care",
  "Toys & Games",
  "Sports & Outdoors",
  "Automotive",
  "Pet Supplies",
  "Grocery",
  "Tools & Home Improvement",
  "Office Products",
  "Health & Household",
  "Baby",
  "Arts, Crafts & Sewing",
  "Industrial & Scientific",
  "Musical Instruments",
  "Video Games",
  "Software"
];

async function run() {
  const db = getDb();
  console.log("Starting to insert Amazon categories...");

  let allCategories = await db.select().from(categories);
  const existingNames = allCategories.map((c: any) => c.name);

  let inserted = 0;
  for (const name of amazonCategories) {
    if (!existingNames.includes(name)) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await db.insert(categories).values({
        name,
        slug,
        description: `Everything you need in ${name}`,
        isActive: 1
      });
      console.log(`Added category: ${name} (${slug})`);
      inserted++;
    } else {
      console.log(`Category already exists: ${name}`);
    }
  }

  console.log(`Finished. Inserted ${inserted} new categories.`);
  process.exit(0);
}

run().catch(console.error);
