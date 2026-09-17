import {
  mysqlTable,
  integer,
  text,
  real,
  index,
  sql,
} from "./mysql.ts";

// ─── Timestamps helper (MySQL millisecond timestamp) ──────────────────────────
const NOW = sql`ROUND(UNIX_TIMESTAMP(NOW(3)) * 1000)`;

// ============================================================
// 1. USERS (extends auth users)
// ============================================================
export const users = mysqlTable("users", {
  id: integer("id").primaryKey().notNull(),
  unionId: text("unionId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  gender: text("gender"),
  dateOfBirth: text("dateOfBirth"),
  passwordHash: text("password_hash"),
  role: text("role").default("customer").notNull(),
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
  lastSignInAt: integer("lastSignInAt").default(NOW).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// 2. SELLERS
// ============================================================
export const sellers = mysqlTable("sellers", {
  id: integer("id").primaryKey().notNull(),
  userId: integer("userId").notNull(),
  businessName: text("business_name").notNull(),
  shopName: text("shop_name"),
  businessType: text("business_type"),
  nidNumber: text("nid_number"),
  tradeLicenseNumber: text("trade_license_number"),
  businessAddress: text("business_address"),
  district: text("district"),
  businessEmail: text("business_email").notNull(),
  businessPhone: text("business_phone"),
  description: text("description"),
  logo: text("logo"),
  banner: text("banner"),
  status: text("status").default("pending").notNull(),
  rating: real("rating").default(0),
  totalSales: integer("total_sales").default(0),
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
}, (table) => ({
  userIdIdx: index("seller_user_id_idx").on(table.userId),
  statusIdx: index("seller_status_idx").on(table.status),
}));

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

// ============================================================
// 3. CATEGORIES
// ============================================================
export const categories = mysqlTable("categories", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  parentId: integer("parentId"),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: integer("createdAt").default(NOW).notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ============================================================
// 4. PRODUCTS
// ============================================================
export const products = mysqlTable("products", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  price: real("price").notNull(),
  comparePrice: real("compare_price"),
  costPrice: real("cost_price"),
  sku: text("sku"),
  barcode: text("barcode"),
  categoryId: integer("categoryId").notNull(),
  sellerId: integer("sellerId").notNull(),
  deliveryFeeInsideDhaka: real("delivery_fee_inside_dhaka").default(0),
  deliveryFeeOutsideDhaka: real("delivery_fee_outside_dhaka").default(0),
  tags: text("tags"),
  attributes: text("attributes"),
  status: text("status").default("active").notNull(),
  isFeatured: integer("is_featured").default(0).notNull(),
  isTrending: integer("is_trending").default(0).notNull(),
  weight: real("weight"),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  soldCount: integer("sold_count").default(0),
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
}, (table) => ({
  categoryIdx: index("product_category_idx").on(table.categoryId),
  sellerIdx: index("product_seller_idx").on(table.sellerId),
  statusIdx: index("product_status_idx").on(table.status),
  featuredIdx: index("product_featured_idx").on(table.isFeatured),
  slugIdx: index("product_slug_idx").on(table.slug),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ============================================================
// 5. PRODUCT IMAGES
// ============================================================
export const productImages = mysqlTable("product_images", {
  id: integer("id").primaryKey().notNull(),
  productId: integer("productId").notNull(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  isPrimary: integer("is_primary").default(0).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("createdAt").default(NOW).notNull(),
}, (table) => ({
  productIdx: index("image_product_idx").on(table.productId),
}));

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

// ============================================================
// 6. INVENTORY
// ============================================================
export const inventory = mysqlTable("inventory", {
  id: integer("id").primaryKey().notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  warehouseLocation: text("warehouse_location"),
  lastRestocked: integer("last_restocked"),
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
}, (table) => ({
  productIdx: index("inventory_product_idx").on(table.productId),
}));

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

// ============================================================
// 6.5 PRODUCT VARIANTS
// ============================================================
export const productVariants = mysqlTable("product_variants", {
  id: integer("id").primaryKey().notNull(),
  productId: integer("product_id").notNull(),
  size: text("size").notNull(),
  color: text("color"),
  quantity: integer("quantity").notNull().default(0),
}, (table) => ({
  productIdx: index("variant_product_idx").on(table.productId),
}));

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

// ============================================================
// 7. CART
// ============================================================
export const carts = mysqlTable("carts", {
  id: integer("id").primaryKey().notNull(),
  userId: integer("userId").notNull(),
  sessionId: text("session_id"),
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
}, (table) => ({
  userIdx: index("cart_user_idx").on(table.userId),
}));

export type Cart = typeof carts.$inferSelect;
export type InsertCart = typeof carts.$inferInsert;

// ============================================================
// 8. CART ITEMS
// ============================================================
export const cartItems = mysqlTable("cart_items", {
  id: integer("id").primaryKey().notNull(),
  cartId: integer("cartId").notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  attributes: text("attributes"),
  createdAt: integer("createdAt").default(NOW).notNull(),
}, (table) => ({
  cartIdx: index("cartitem_cart_idx").on(table.cartId),
  productIdx: index("cartitem_product_idx").on(table.productId),
}));

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// ============================================================
// 9. ORDERS
// ============================================================
export const orders = mysqlTable("orders", {
  id: integer("id").primaryKey().notNull(),
  orderNumber: text("order_number").notNull().unique(),
  userId: integer("userId").notNull(),
  totalAmount: real("total_amount").notNull(),
  taxAmount: real("tax_amount").default(0),
  shippingAmount: real("shipping_amount").default(0),
  discountAmount: real("discount_amount").default(0),
  status: text("status").default("pending").notNull(),
  paymentStatus: text("payment_status").default("pending").notNull(),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  shippingFullName: text("shipping_full_name"),
  shippingEmail: text("shipping_email"),
  shippingPhone: text("shipping_phone"),
  shippingAddress: text("shipping_address"),
  shippingCity: text("shipping_city"),
  shippingDistrict: text("shipping_district"),
  shippingCountry: text("shipping_country"),
  shippingPostalCode: text("shipping_postal_code"),
  shippingLandmark: text("shipping_landmark"),
  trackingNumber: text("tracking_number"),
  sellerStatus: text("seller_status").default("pending").notNull(), // "pending" | "accepted" | "denied" | "handed_over"
  lastEditedBy: text("last_edited_by"),
  lastEditedAt: integer("last_edited_at"),
  courierName: text("courier_name"), // e.g. "Pathao Express", "Steadfast Courier", "Paperfly"
  estimatedDeliveryDays: integer("estimated_delivery_days"), // 1-2 inside city, 3-5 outside city
  estimatedDeliveryDate: integer("estimated_delivery_date"),
  notes: text("notes"),
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
}, (table) => ({
  userIdx: index("order_user_idx").on(table.userId),
  statusIdx: index("order_status_idx").on(table.status),
  orderNumberIdx: index("order_number_idx").on(table.orderNumber),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ============================================================
// 10. ORDER ITEMS
// ============================================================
export const orderItems = mysqlTable("order_items", {
  id: integer("id").primaryKey().notNull(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId").notNull(),
  sellerId: integer("sellerId").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  attributes: text("attributes"),
  isReviewed: integer("is_reviewed").default(0).notNull(),
  createdAt: integer("createdAt").default(NOW).notNull(),
}, (table) => ({
  orderIdx: index("orderitem_order_idx").on(table.orderId),
  productIdx: index("orderitem_product_idx").on(table.productId),
  sellerIdx: index("orderitem_seller_idx").on(table.sellerId),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ============================================================
// 11. REVIEWS
// ============================================================
export const reviews = mysqlTable("reviews", {
  id: integer("id").primaryKey().notNull(),
  productId: integer("productId").notNull(),
  userId: integer("userId").notNull(),
  orderId: integer("orderId"),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  isVerified: integer("is_verified").default(0).notNull(),
  helpful: integer("helpful").default(0),
  createdAt: integer("createdAt").default(NOW).notNull(),
}, (table) => ({
  productIdx: index("review_product_idx").on(table.productId),
  userIdx: index("review_user_idx").on(table.userId),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;


// ============================================================
// 12. WISHLIST
// ============================================================
export const wishlist = mysqlTable("wishlist", {
  id: integer("id").primaryKey().notNull(),
  userId: integer("userId").notNull(),
  productId: integer("productId").notNull(),
  createdAt: integer("createdAt").default(NOW).notNull(),
}, (table) => ({
  userIdx: index("wishlist_user_idx").on(table.userId),
  productIdx: index("wishlist_product_idx").on(table.productId),
}));

export type WishlistItem = typeof wishlist.$inferSelect;
export type InsertWishlistItem = typeof wishlist.$inferInsert;

// ============================================================
// 13. NOTIFICATIONS
// ============================================================
export const notifications = mysqlTable("notifications", {
  id: integer("id").primaryKey().notNull(),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  type: text("type").default("system").notNull(),
  isRead: integer("is_read").default(0).notNull(),
  link: text("link"),
  createdAt: integer("createdAt").default(NOW).notNull(),
}, (table) => ({
  userIdx: index("notification_user_idx").on(table.userId),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================
// 14. SUPPORT LEARNING - AI Self-Improvement Data
// ============================================================
export const supportLearning = mysqlTable("support_learning", {
  id: integer("id").primaryKey().notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(), // 'order_tracking', 'shipping', 'returns', 'payments', 'account', 'products', 'general'
  feedback: text("feedback"), // 'helpful', 'not_helpful', null
  confidence: real("confidence").default(0.5),
  userId: integer("userId"),
  sessionId: text("session_id"),
  context: text("context"), // JSON string of context data
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
}, (table) => ({
  categoryIdx: index("support_learning_category_idx").on(table.category),
  feedbackIdx: index("support_learning_feedback_idx").on(table.feedback),
  userIdIdx: index("support_learning_user_idx").on(table.userId),
  sessionIdx: index("support_learning_session_idx").on(table.sessionId),
  createdAtIdx: index("support_learning_created_idx").on(table.createdAt),
}));

export type SupportLearning = typeof supportLearning.$inferSelect;
export type InsertSupportLearning = typeof supportLearning.$inferInsert;

// ============================================================
// 15. SUPPORT KNOWLEDGE BASE - Curated Knowledge for AI
// ============================================================
export const supportKnowledge = mysqlTable("support_knowledge", {
  id: integer("id").primaryKey().notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
  keywords: text("keywords"), // Comma-separated keywords for matching
  priority: integer("priority").default(0), // Higher = more important
  isActive: integer("is_active").default(1).notNull(),
  source: text("source").default("manual"), // 'manual', 'learned', 'imported'
  usageCount: integer("usage_count").default(0),
  lastUsed: integer("last_used"),
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
}, (table) => ({
  categoryIdx: index("support_knowledge_category_idx").on(table.category),
  isActiveIdx: index("support_knowledge_active_idx").on(table.isActive),
  priorityIdx: index("support_knowledge_priority_idx").on(table.priority),
}));

export type SupportKnowledge = typeof supportKnowledge.$inferSelect;
export type InsertSupportKnowledge = typeof supportKnowledge.$inferInsert;

// ============================================================
// 16. CHAT SESSIONS (For Persistent UI Chat)
// ============================================================
export const chatSessions = mysqlTable("chat_sessions", {
  id: text("id").primaryKey().notNull(), // UUID
  userId: integer("userId"),
  sessionType: text("session_type").notNull(), // 'stylist', 'support'
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
}, (table) => ({
  userIdIdx: index("chat_sessions_user_idx").on(table.userId),
  typeIdx: index("chat_sessions_type_idx").on(table.sessionType),
}));

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

// ============================================================
// 17. CHAT MESSAGES
// ============================================================
export const chatMessages = mysqlTable("chat_messages", {
  id: integer("id").primaryKey().notNull(),
  sessionId: text("sessionId").notNull(),
  role: text("role").notNull(), // 'user', 'assistant'
  content: text("content").notNull(),
  type: text("type").default("general").notNull(), // 'general', 'outfit', 'color', etc.
  data: text("data"), // JSON string of specific widget data
  createdAt: integer("createdAt").default(NOW).notNull(),
}, (table) => ({
  sessionIdx: index("chat_messages_session_idx").on(table.sessionId),
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ============================================================
// 18. STYLIST PROFILES
// ============================================================
export const stylistProfiles = mysqlTable("stylist_profiles", {
  id: integer("id").primaryKey().notNull(),
  userId: integer("userId").notNull().unique(),
  gender: text("gender"), // "male", "female", "non-binary", "prefer-not-to-say"
  ageGroup: text("ageGroup"), // "18-24", "25-34", etc.
  stylePreference: text("stylePreference"), // "classic", "minimalist", etc.
  budgetRange: text("budgetRange"), // "budget", "mid-range", "premium"
  favoriteColors: text("favoriteColors"), // string[] (JSON serialized)
  createdAt: integer("createdAt").default(NOW).notNull(),
  updatedAt: integer("updatedAt").default(NOW).notNull(),
});

export type StylistProfile = typeof stylistProfiles.$inferSelect;
export type InsertStylistProfile = typeof stylistProfiles.$inferInsert;

// ============================================================
// 19. SELLER PAYOUTS
// ============================================================
export const sellerPayouts = mysqlTable("seller_payouts", {
  id: integer("id").primaryKey().notNull(),
  sellerId: integer("sellerId").notNull(),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // 'bank' | 'bkash' | 'nagad'
  accountDetails: text("account_details").notNull(),
  status: text("status").default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  createdAt: integer("createdAt").default(NOW).notNull(),
});

export type SellerPayout = typeof sellerPayouts.$inferSelect;
export type InsertSellerPayout = typeof sellerPayouts.$inferInsert;

// ============================================================
// 21. SELLER MESSAGES
// ============================================================
export const sellerMessages = mysqlTable("seller_messages", {
  id: integer("id").primaryKey().notNull(),
  sellerId: integer("sellerId").notNull(),
  customerId: integer("customerId"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  productId: integer("productId"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  reply: text("reply"),
  status: text("status").default("unread").notNull(), // 'unread' | 'replied'
  createdAt: integer("createdAt").default(NOW).notNull(),
});

export type SellerMessage = typeof sellerMessages.$inferSelect;
export type InsertSellerMessage = typeof sellerMessages.$inferInsert;

// ============================================================
// 22. USER ADDRESSES
// ============================================================
export const userAddresses = mysqlTable("user_addresses", {
  id: integer("id").primaryKey().notNull(),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  recipientName: text("recipient_name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  phone: text("phone"),
  isPrimary: integer("is_primary").default(0).notNull(),
  createdAt: integer("createdAt").default(NOW).notNull(),
});

export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = typeof userAddresses.$inferInsert;


