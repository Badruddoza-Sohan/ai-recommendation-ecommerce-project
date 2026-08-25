import fs from "fs";
import path from "path";
import { getDb } from "../api/queries/connection";
import * as schema from "../db/schema";
import * as aiSchema from "../db/aiSchema";

async function exportFullBackup() {
  console.log("📦 Creating full database backup snapshot...");
  const db = getDb();

  const [
    allUsers,
    allSellers,
    allCategories,
    allProducts,
    allProductImages,
    allInventory,
    allCarts,
    allCartItems,
    allOrders,
    allOrderItems,
    allReviews,
    allWishlist,
    allNotifications,
    allSellerPayouts,
    allSellerMessages,
    allStylistProfiles,
    allEscalationTickets,
    allTicketMessages,
  ] = await Promise.all([
    db.select().from(schema.users),
    db.select().from(schema.sellers),
    db.select().from(schema.categories),
    db.select().from(schema.products),
    db.select().from(schema.productImages),
    db.select().from(schema.inventory),
    db.select().from(schema.carts),
    db.select().from(schema.cartItems),
    db.select().from(schema.orders),
    db.select().from(schema.orderItems),
    db.select().from(schema.reviews),
    db.select().from(schema.wishlist),
    db.select().from(schema.notifications),
    db.select().from(schema.sellerPayouts),
    db.select().from(schema.sellerMessages),
    db.select().from(schema.stylistProfiles),
    db.select().from(aiSchema.escalationTickets),
    db.select().from(aiSchema.ticketMessages),
  ]);

  const backupData = {
    exportDate: new Date().toISOString(),
    timestamp: Date.now(),
    counts: {
      users: allUsers.length,
      sellers: allSellers.length,
      categories: allCategories.length,
      products: allProducts.length,
      productImages: allProductImages.length,
      inventory: allInventory.length,
      carts: allCarts.length,
      cartItems: allCartItems.length,
      orders: allOrders.length,
      orderItems: allOrderItems.length,
      reviews: allReviews.length,
      wishlist: allWishlist.length,
      notifications: allNotifications.length,
      sellerPayouts: allSellerPayouts.length,
      sellerMessages: allSellerMessages.length,
      stylistProfiles: allStylistProfiles.length,
      escalationTickets: allEscalationTickets.length,
      ticketMessages: allTicketMessages.length,
    },
    tables: {
      users: allUsers,
      sellers: allSellers,
      categories: allCategories,
      products: allProducts,
      productImages: allProductImages,
      inventory: allInventory,
      carts: allCarts,
      cartItems: allCartItems,
      orders: allOrders,
      orderItems: allOrderItems,
      reviews: allReviews,
      wishlist: allWishlist,
      notifications: allNotifications,
      sellerPayouts: allSellerPayouts,
      sellerMessages: allSellerMessages,
      stylistProfiles: allStylistProfiles,
      escalationTickets: allEscalationTickets,
      ticketMessages: allTicketMessages,
    },
  };

  const backupPath = path.resolve(process.cwd(), "db/backup_snapshot.json");
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");

  console.log("✅ FULL BACKUP CREATED SUCCESSFULLY!");
  console.log("File Location:", backupPath);
  console.log("Summary of Saved Data:");
  console.table(backupData.counts);
}

exportFullBackup().catch((err) => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});
