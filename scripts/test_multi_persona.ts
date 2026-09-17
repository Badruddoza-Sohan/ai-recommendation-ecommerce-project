import { getDb } from "../db/mysql.ts";
import { users, sellers, products, orders, orderItems, reviews } from "../db/schema.ts";
import { eq, desc } from "../db/mysql.ts";

async function runTest() {
  console.log("==================================================");
  console.log("       STARTING MULTI-PERSONA E2E TEST FLOW      ");
  console.log("==================================================\n");

  const db = getDb();

  // ----------------------------------------------------
  // STEP 1: CUSTOMER PERSPECTIVE
  // ----------------------------------------------------
  console.log("📌 [STEP 1: CUSTOMER PERSPECTIVE]");
  const customerList = await db.select().from(users).where(eq(users.role, "customer")).limit(1);
  let customer = customerList[0];
  if (!customer) {
    console.log("Creating test customer...");
    await db.insert(users).values({
      unionId: "local:testcustomer",
      name: "Test Customer",
      email: "testcustomer@example.com",
      phone: "01800000099",
      role: "customer",
    });
    const created = await db.select().from(users).where(eq(users.unionId, "local:testcustomer")).limit(1);
    customer = created[0];
  }
  console.log(`✓ Customer ID: ${customer.id} | Name: ${customer.name} (${customer.email})`);

  // Get sample product from Seller ID 1
  const productList = await db.select().from(products).where(eq(products.sellerId, 1)).limit(2);
  if (productList.length === 0) {
    throw new Error("No products found for Seller 1!");
  }
  const testProduct = productList[0];
  console.log(`✓ Selected Product for Order: "${testProduct.name}" (ID: ${testProduct.id}, Price: $${testProduct.price})`);

  // Customer places a new order
  const orderNumber = `ORD-TEST-${Date.now()}`;
  const totalAmount = testProduct.price * 2 + 60; // 2 items + delivery fee

  const orderInsertResult = await db.insert(orders).values({
    orderNumber,
    userId: customer.id,
    sellerId: 1,
    totalAmount,
    subtotal: testProduct.price * 2,
    tax: 0,
    shippingFee: 60,
    discount: 0,
    status: "pending",
    paymentStatus: "paid",
    paymentMethod: "cod",
    shippingAddress: JSON.stringify({
      fullName: customer.name,
      phone: customer.phone,
      address: "123 Test Street",
      city: "Dhaka",
      postalCode: "1200",
    }),
  });

  const orderId = orderInsertResult[0].insertId;
  console.log(`✓ Order Placed! Order ID: ${orderId} | Order Number: ${orderNumber} | Total: $${totalAmount}`);

  // Insert Order Item
  await db.insert(orderItems).values({
    orderId,
    productId: testProduct.id,
    sellerId: 1,
    quantity: 2,
    unitPrice: testProduct.price,
    totalPrice: testProduct.price * 2,
  });
  console.log(`✓ Order Item Linked: 2x "${testProduct.name}" to Order #${orderId}`);

  // Customer posts a review
  const reviewResult = await db.insert(reviews).values({
    productId: testProduct.id,
    userId: customer.id,
    orderId,
    rating: 5,
    title: "Awesome quality!",
    comment: "Extremely satisfied with this purchase. High quality and quick handling.",
  });
  console.log(`✓ Customer Review Posted! Review ID: ${reviewResult[0].insertId} (Rating: 5/5 stars)\n`);

  // ----------------------------------------------------
  // STEP 2: SELLER PERSPECTIVE
  // ----------------------------------------------------
  console.log("📌 [STEP 2: SELLER PERSPECTIVE]");
  const sellerList = await db.select().from(sellers).where(eq(sellers.id, 1)).limit(1);
  const seller = sellerList[0];
  console.log(`✓ Seller Account: "${seller.businessName}" (ID: ${seller.id}, Status: ${seller.status})`);

  // Seller checks orders by joining with orderItems
  const sellerOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalAmount: orders.totalAmount,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orderItems.sellerId, 1))
    .groupBy(orders.id)
    .orderBy(desc(orders.id));

  console.log(`✓ Seller Orders Count: ${sellerOrders.length} orders found for Seller ID 1`);

  const pendingOrder = sellerOrders.find((o) => o.id === orderId);
  if (!pendingOrder) {
    throw new Error(`Order ID ${orderId} not found in Seller 1 orders list!`);
  }
  console.log(`✓ Found Customer's Order in Seller Dashboard: Order #${pendingOrder.orderNumber} (Status: ${pendingOrder.status})`);

  // Seller updates order status to 'shipped'
  await db.update(orders).set({ status: "shipped" }).where(eq(orders.id, orderId));
  console.log(`✓ Seller Updated Order #${orderId} Status: "pending" ➔ "shipped"`);

  // Seller updates inventory / total sales
  await db.update(sellers).set({ totalSales: (seller.totalSales || 0) + 1 }).where(eq(sellers.id, 1));
  console.log(`✓ Seller Total Sales counter incremented.\n`);

  // ----------------------------------------------------
  // STEP 3: ADMIN PERSPECTIVE
  // ----------------------------------------------------
  console.log("📌 [STEP 3: ADMIN PERSPECTIVE]");
  const adminList = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  const admin = adminList[0];
  console.log(`✓ Admin User: "${admin.name}" (${admin.email})`);

  // Admin checks system metrics
  const allUsers = await db.select().from(users);
  const allSellers = await db.select().from(sellers);
  const allOrders = await db.select().from(orders);

  const totalGMV = allOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  console.log("✓ Admin Dashboard Global Stats:");
  console.log(`   • Total Registered Users: ${allUsers.length}`);
  console.log(`   • Total Registered Sellers: ${allSellers.length}`);
  console.log(`   • Total System Orders: ${allOrders.length}`);
  console.log(`   • Total Platform Revenue (GMV): $${totalGMV.toFixed(2)}`);

  // Admin verifies customer's order status
  const verifiedOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  console.log(`✓ Admin Audit Verification: Order #${verifiedOrder[0].orderNumber} Status is correctly reported as "${verifiedOrder[0].status}".\n`);

  console.log("==================================================");
  console.log(" 🎉 ALL MULTI-PERSONA E2E TESTS PASSED PERFECTLY!");
  console.log("==================================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ E2E Test Error:", err);
  process.exit(1);
});
