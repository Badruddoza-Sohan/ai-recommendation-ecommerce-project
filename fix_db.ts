
import { getDb } from "./api/queries/connection";
async function run() {
  const db = getDb();
  try {
    await db.execute("ALTER TABLE cart_items ADD COLUMN attributes TEXT");
    console.log("Column added successfully!");
  } catch (e) {
    console.error(e.message);
  }
}
run().then(() => process.exit(0)).catch(() => process.exit(1));

