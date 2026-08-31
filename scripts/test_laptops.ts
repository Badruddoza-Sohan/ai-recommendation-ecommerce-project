import { db } from "../db/index.ts";
import { products } from "../db/schema.ts";
import { like, eq, and } from "drizzle-orm";

async function run() {
  const allLaptops = await db.select().from(products).where(like(products.name, "%laptop%"));
  console.log("All laptops in DB:");
  allLaptops.forEach(p => console.log(`${p.name} - ${p.price} BDT - ID: ${p.id} - Attrs: ${p.attributes}`));
}

run().catch(console.error);
