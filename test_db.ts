
import { getDb } from "./server/api/queries/connection";
import { cartItems, carts } from "./db/schema";
async function run() {
  const db = getDb();
  const c = await db.select().from(carts);
  const items = await db.select().from(cartItems);
  console.log("Carts:", c.length, "Cart items:", items.length);
}
run().catch(console.error);

