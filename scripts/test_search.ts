import { db } from "../server/db";
import { products } from "../server/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  const query = "Electronics";
  const res = await db.query.products.findMany({
    where: (products, { ilike, or }) => or(
      ilike(products.name, `%${query}%`),
      ilike(products.description, `%${query}%`)
    ),
  });
  console.log("Found", res.length, "items.");
  process.exit(0);
}

run();
