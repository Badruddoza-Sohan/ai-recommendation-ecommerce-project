import { getDb } from "../api/queries/connection.ts";

async function clear() {
  const db = getDb();
  console.log("Clearing all seeded data from database...");

  const pool = db.raw();
  const [tables]: any = await pool.query("SHOW TABLES");

  if (tables && tables.length > 0) {
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const row of tables) {
      const tableName = Object.values(row)[0] as string;
      try {
        await pool.query(`TRUNCATE TABLE \`${tableName}\``);
        console.log(`  ✓ Cleared table: ${tableName}`);
      } catch (err) {
        // Fallback to DELETE
        await pool.query(`DELETE FROM \`${tableName}\``);
        console.log(`  ✓ Deleted rows from: ${tableName}`);
      }
    }
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  }

  console.log("✅ All seeded data successfully removed.");
  process.exit(0);
}

clear().catch((err) => {
  console.error("❌ Error clearing data:", err);
  process.exit(1);
});
