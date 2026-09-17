import { randomBytes, scryptSync } from "node:crypto";
import { getDb } from "../api/queries/connection.ts";
import { eq } from "./mysql.ts";
import {
  users,
  sellers,
  categories,
  products,
  productImages,
  inventory,
  carts,
  cartItems,
  orders,
  orderItems,
  reviews,
  wishlist,
  notifications,
  supportKnowledge,
} from "./schema.ts";
import { escalationTickets } from "./aiSchema.ts";
import { PRODUCT_IMAGE_MAP, CATEGORY_GALLERY_IMAGES } from "../scripts/fix_product_images.ts";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "../api/lib/env.ts";

function buildPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function seed() {
  const db = getDb();
  const isForce = process.argv.includes("--force");
  const pool = db.raw();

  if (!isForce) {
    try {
      const [userRows]: any = await pool.query("SELECT COUNT(*) as count FROM users");
      if (userRows && userRows[0] && userRows[0].count > 0) {
        console.log("ℹ️ Database already contains user and seller data. Preserving existing records.");
        console.log("   (To force re-seeding, run: npm run db:seed -- --force)");
        return;
      }
    } catch (_err) {
      // Tables might not exist yet, proceed with schema creation and seed
    }
  }

  // Reset existing tables in MySQL
  const [tables]: any = await pool.query("SHOW TABLES");
  if (tables.length > 0) {
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const row of tables) {
      const tableName = Object.values(row)[0] as string;
      await pool.query(`TRUNCATE TABLE \`${tableName}\``);
    }
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  }

  // Ensure user_addresses table exists in MySQL
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`user_addresses\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`recipient_name\` VARCHAR(255) NOT NULL,
        \`address\` TEXT NOT NULL,
        \`city\` VARCHAR(255) NOT NULL,
        \`country\` VARCHAR(255) NOT NULL DEFAULT 'Bangladesh',
        \`phone\` VARCHAR(50) NULL,
        \`is_primary\` INT NOT NULL DEFAULT 0,
        \`createdAt\` BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e: any) {}

  // ============================================================
  // 1. CREATE USERS
  // ============================================================
  console.log("Creating users...");
  const userData = [
    {
      id: 1,
      unionId: "local:01700000001",
      name: "TechVault Seller",
      email: "techvault@example.com",
      phone: "01700000001",
      passwordHash: buildPasswordHash("seller123"),
      role: "seller",
    },
    {
      id: 2,
      unionId: "local:01700000002",
      name: "StyleHub Seller",
      email: "stylehub@example.com",
      phone: "01700000002",
      passwordHash: buildPasswordHash("seller123"),
      role: "seller",
    },
    {
      id: 3,
      unionId: "local:01700000003",
      name: "Comfort Living Seller",
      email: "comfort@example.com",
      phone: "01700000003",
      passwordHash: buildPasswordHash("seller123"),
      role: "seller",
    },
    {
      id: 4,
      unionId: "local:01700000004",
      name: "ActiveLife Seller",
      email: "activelife@example.com",
      phone: "01700000004",
      passwordHash: buildPasswordHash("seller123"),
      role: "seller",
    },
    {
      id: 5,
      unionId: "local:01700000005",
      name: "PageTurner Seller",
      email: "pageturner@example.com",
      phone: "01700000005",
      passwordHash: buildPasswordHash("seller123"),
      role: "seller",
    },
    {
      id: 6,
      unionId: "local:01700000006",
      name: "Admin User",
      email: "admin@example.com",
      phone: "01700000006",
      passwordHash: buildPasswordHash("admin123"),
      role: "admin",
    },
    {
      id: 7,
      unionId: "local:01700000007",
      name: "Test Customer",
      email: "testcustomer@example.com",
      phone: "01700000007",
      passwordHash: buildPasswordHash("customer123"),
      role: "customer",
    },
  ];
  await db.insert(users).values(userData);
  const allUsers = await db.select().from(users);
  console.log(`Created ${allUsers.length} users`);

  // ============================================================
  // 2. CREATE CATEGORIES
  // ============================================================
  console.log("Creating categories...");
  const categoryData = [
    { name: "Electronics", slug: "electronics", description: "Gadgets, devices, and electronic accessories", image: "https://images.unsplash.com/photo-1498049860654-af1a5c5668ba?w=400" },
    { name: "Fashion", slug: "fashion", description: "Clothing, shoes, and accessories for men and women", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400" },
    { name: "Home & Living", slug: "home-living", description: "Furniture, decor, and home essentials", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400" },
    { name: "Sports & Outdoors", slug: "sports-outdoors", description: "Sports equipment, outdoor gear, and fitness", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400" },
    { name: "Books & Media", slug: "books-media", description: "Books, e-books, music, and movies", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400" },
    { name: "Health & Beauty", slug: "health-beauty", description: "Skincare, makeup, and wellness products", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400" },
    { name: "Toys & Kids", slug: "toys-kids", description: "Toys, games, and baby products", image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400" },
    { name: "Food & Beverages", slug: "food-beverages", description: "Gourmet food, drinks, and snacks", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400" },
    { name: "Automotive", slug: "automotive", description: "Car accessories, tools, and parts", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400" },
    { name: "Jewelry & Watches", slug: "jewelry-watches", description: "Fine jewelry, watches, and accessories", image: "https://images.unsplash.com/photo-1515562142789-8637e836b802?w=400" },
  ];

  const insertedCategories = await db.insert(categories).values(categoryData);
  const allCategories = await db.select().from(categories);
  console.log(`Created ${allCategories.length} categories`);

  // ============================================================
  // 2. CREATE SELLERS
  // ============================================================
  console.log("Creating sellers...");
  const sellerData = [
    { userId: 1, businessName: "TechVault Electronics", businessEmail: "techvault@example.com", businessPhone: "+1-555-0101", description: "Premium electronics and gadgets at competitive prices. We specialize in the latest tech products from top brands.", logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200", banner: "https://images.unsplash.com/photo-1550009158-9ebf69056955?w=800", status: "approved" as const, rating: 4.8, totalSales: 1240 },
    { userId: 2, businessName: "StyleHub Fashion", businessEmail: "stylehub@example.com", businessPhone: "+1-555-0102", description: "Trendy fashion for the modern lifestyle. From casual wear to formal attire, we have it all.", logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200", banner: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800", status: "approved" as const, rating: 4.5, totalSales: 890 },
    { userId: 3, businessName: "Comfort Living", businessEmail: "comfort@example.com", businessPhone: "+1-555-0103", description: "Transform your home into a sanctuary with our curated collection of furniture and decor.", logo: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=200", banner: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800", status: "approved" as const, rating: 4.7, totalSales: 650 },
    { userId: 4, businessName: "ActiveLife Sports", businessEmail: "activelife@example.com", businessPhone: "+1-555-0104", description: "Your one-stop shop for sports equipment and outdoor gear. Gear up for adventure!", logo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200", banner: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800", status: "approved" as const, rating: 4.6, totalSales: 430 },
    { userId: 5, businessName: "PageTurner Books", businessEmail: "pageturner@example.com", businessPhone: "+1-555-0105", description: "A curated selection of books spanning all genres. Discover your next great read with us.", logo: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=200", banner: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800", status: "approved" as const, rating: 4.9, totalSales: 2100 },
  ];

  await db.insert(sellers).values(sellerData);
  const allSellers = await db.select().from(sellers);
  console.log(`Created ${allSellers.length} sellers`);

  // ============================================================
  // 3. CREATE PRODUCTS (100+ products)
  // ============================================================
  console.log("Creating products...");
  const productData = [
    // ELECTRONICS (categoryId 1)
    { name: "Wireless Bluetooth Headphones Pro", slug: "wireless-bluetooth-headphones-pro", description: "Premium over-ear headphones with active noise cancellation, 40-hour battery life, and superior sound quality. Features memory foam ear cushions for all-day comfort.", shortDescription: "Premium ANC headphones with 40hr battery", price: 12999, comparePrice: 17999, costPrice: 6500, sku: "ELEC-001", categoryId: 1, sellerId: 1, tags: "headphones,bluetooth,wireless,audio,noise-cancelling", attributes: '{"color":"Black","connectivity":"Bluetooth 5.2","battery":"40 hours","weight":"250g"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.7, reviewCount: 128, soldCount: 450 },
    { name: "Smart Watch Ultra Series", slug: "smart-watch-ultra-series", description: "Advanced fitness tracking smartwatch with GPS, heart rate monitor, blood oxygen sensor, and always-on Retina display. Water resistant to 50 meters.", shortDescription: "Advanced fitness smartwatch with GPS", price: 29999, comparePrice: 34999, costPrice: 15000, sku: "ELEC-002", categoryId: 1, sellerId: 1, tags: "smartwatch,fitness,wearable,GPS,health", attributes: '{"color":"Midnight","display":"1.9 inch OLED","battery":"36 hours","water":"50m"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.5, reviewCount: 89, soldCount: 320 },
    { name: "Ultra-Slim Laptop Stand", slug: "ultra-slim-laptop-stand", description: "Ergonomic aluminum laptop stand with adjustable height. Compatible with all laptops 11-17 inches. Foldable and portable design.", shortDescription: "Ergonomic aluminum laptop stand", price: 4999, comparePrice: 6999, costPrice: 2200, sku: "ELEC-003", categoryId: 1, sellerId: 1, tags: "laptop,stand,ergonomic,aluminum,office", attributes: '{"material":"Aluminum","compatibility":"11-17 inch","weight":"0.5kg","color":"Silver"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.8, reviewCount: 210, soldCount: 670 },
    { name: "Portable Charger 20000mAh", slug: "portable-charger-20000mah", description: "High-capacity power bank with USB-C PD 65W fast charging. Charge your laptop, phone, and tablet simultaneously. LED display shows remaining power.", shortDescription: "20000mAh power bank with 65W PD", price: 5999, comparePrice: 7999, costPrice: 2800, sku: "ELEC-004", categoryId: 1, sellerId: 1, tags: "powerbank,charger,portable,usb-c,fast-charging", attributes: '{"capacity":"20000mAh","output":"65W PD","ports":"2 USB-C, 1 USB-A","weight":"350g"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 156, soldCount: 890 },
    { name: "4K Webcam with Ring Light", slug: "4k-webcam-ring-light", description: "Professional 4K webcam with built-in ring light and dual microphones. Perfect for streaming, video calls, and content creation.", shortDescription: "4K webcam with ring light and mics", price: 8999, comparePrice: 11999, costPrice: 4200, sku: "ELEC-005", categoryId: 1, sellerId: 1, tags: "webcam,4k,streaming,video-call,ring-light", attributes: '{"resolution":"4K","microphone":"Dual","light":"Adjustable ring","connection":"USB-C"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.4, reviewCount: 78, soldCount: 230 },
    { name: "Mechanical Gaming Keyboard RGB", slug: "mechanical-gaming-keyboard-rgb", description: "Full-size mechanical keyboard with hot-swappable switches, per-key RGB lighting, and aircraft-grade aluminum frame.", shortDescription: "Hot-swappable mechanical RGB keyboard", price: 11999, comparePrice: 14999, costPrice: 5500, sku: "ELEC-006", categoryId: 1, sellerId: 1, tags: "keyboard,gaming,mechanical,rgb,hot-swap", attributes: '{"switches":"Cherry MX Red","layout":"Full","lighting":"Per-key RGB","material":"Aluminum"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.9, reviewCount: 312, soldCount: 540 },
    { name: "Wireless Mouse Ergonomic", slug: "wireless-mouse-ergonomic", description: "Ergonomic wireless mouse with adjustable DPI up to 16000, 6 programmable buttons, and 70-day battery life.", shortDescription: "Ergonomic wireless mouse, 16000 DPI", price: 3999, comparePrice: 5499, costPrice: 1800, sku: "ELEC-007", categoryId: 1, sellerId: 1, tags: "mouse,wireless,ergonomic,gaming,productivity", attributes: '{"dpi":"16000","buttons":"6","battery":"70 days","connection":"2.4G + BT"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.3, reviewCount: 167, soldCount: 780 },
    { name: "USB-C Hub 7-in-1 Adapter", slug: "usb-c-hub-7-in-1", description: "Multiport USB-C hub with HDMI 4K, 3x USB 3.0, SD/TF card reader, and 100W PD charging. Aluminum construction.", shortDescription: "7-in-1 USB-C hub with 4K HDMI", price: 3499, comparePrice: 4999, costPrice: 1600, sku: "ELEC-008", categoryId: 1, sellerId: 1, tags: "usb-c,hub,adapter,hdmi,macbook", attributes: '{"ports":"7","hdmi":"4K","charging":"100W","material":"Aluminum"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 203, soldCount: 920 },
    { name: "Bluetooth Speaker Waterproof", slug: "bluetooth-speaker-waterproof", description: "IPX7 waterproof Bluetooth speaker with 360-degree sound, 24-hour playtime, and built-in microphone for hands-free calls.", shortDescription: "IPX7 waterproof speaker, 24hr playtime", price: 4499, comparePrice: 6499, costPrice: 2000, sku: "ELEC-009", categoryId: 1, sellerId: 1, tags: "speaker,bluetooth,waterproof,outdoor,audio", attributes: '{"waterproof":"IPX7","battery":"24 hours","range":"100ft","power":"20W"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.6, reviewCount: 145, soldCount: 560 },
    { name: "Tablet Stand Adjustable", slug: "tablet-stand-adjustable", description: "Universal tablet stand with 270-degree adjustable angle. Compatible with iPad, Galaxy Tab, and all 4-13 inch tablets.", shortDescription: "Adjustable tablet stand, 4-13 inch", price: 2499, comparePrice: 3499, costPrice: 1100, sku: "ELEC-010", categoryId: 1, sellerId: 1, tags: "tablet,stand,adjustable,ipad,holder", attributes: '{"compatibility":"4-13 inch","angle":"270°","material":"Aluminum","foldable":"Yes"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.4, reviewCount: 98, soldCount: 430 },
    { name: "Noise Cancelling Earbuds", slug: "noise-cancelling-earbuds", description: "True wireless earbuds with active noise cancellation, transparency mode, and 30-hour total battery with charging case.", shortDescription: "ANC wireless earbuds, 30hr battery", price: 7999, comparePrice: 9999, costPrice: 3500, sku: "ELEC-011", categoryId: 1, sellerId: 1, tags: "earbuds,wireless,ANC,audio,bluetooth", attributes: '{"anc":"Yes","battery":"30 hours","driver":"11mm","waterproof":"IPX4"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 176, soldCount: 610 },
    { name: "Smart Home Security Camera", slug: "smart-home-security-camera", description: "1080p indoor security camera with night vision, two-way audio, motion detection, and cloud storage support.", shortDescription: "1080p security cam with night vision", price: 5499, comparePrice: 7499, costPrice: 2500, sku: "ELEC-012", categoryId: 1, sellerId: 1, tags: "camera,security,smart-home,wifi,monitoring", attributes: '{"resolution":"1080p","night":"Yes","audio":"Two-way","storage":"Cloud + SD"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.3, reviewCount: 134, soldCount: 380 },

    // FASHION (categoryId 2)
    { name: "Classic Fit Cotton T-Shirt", slug: "classic-fit-cotton-t-shirt", description: "Premium 100% organic cotton t-shirt with a classic fit. Soft, breathable, and pre-shrunk for lasting comfort.", shortDescription: "100% organic cotton classic fit tee", price: 2499, comparePrice: 3499, costPrice: 1000, sku: "FASH-001", categoryId: 2, sellerId: 2, tags: "tshirt,cotton,casual,organic,basic", attributes: '{"material":"100% Cotton","fit":"Classic","care":"Machine wash","sizes":"S-XXL"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.6, reviewCount: 342, soldCount: 1200 },
    { name: "Slim Fit Chino Pants", slug: "slim-fit-chino-pants", description: "Modern slim fit chino pants in stretch cotton twill. Perfect for casual Fridays or weekend outings.", shortDescription: "Stretch cotton slim fit chinos", price: 4999, comparePrice: 6999, costPrice: 2200, sku: "FASH-002", categoryId: 2, sellerId: 2, tags: "pants,chinos,slim-fit,casual,cotton", attributes: '{"material":"97% Cotton 3% Elastane","fit":"Slim","inseam":"30/32/34","colors":"Navy,Khaki,Olive"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.4, reviewCount: 189, soldCount: 670 },
    { name: "Running Shoes Performance", slug: "running-shoes-performance", description: "Lightweight running shoes with responsive cushioning, breathable mesh upper, and durable rubber outsole. Ideal for daily training.", shortDescription: "Lightweight performance running shoes", price: 8999, comparePrice: 11999, costPrice: 4000, sku: "FASH-003", categoryId: 2, sellerId: 2, tags: "shoes,running,sneakers,athletic,training", attributes: '{"weight":"240g","drop":"8mm","cushioning":"Responsive","upper":"Mesh"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.7, reviewCount: 267, soldCount: 890 },
    { name: "Leather Crossbody Bag", slug: "leather-crossbody-bag", description: "Genuine leather crossbody bag with adjustable strap, multiple compartments, and RFID-blocking card slots.", shortDescription: "Genuine leather crossbody with RFID", price: 6999, comparePrice: 9499, costPrice: 3000, sku: "FASH-004", categoryId: 2, sellerId: 2, tags: "bag,leather,crossbody,accessories,purse", attributes: '{"material":"Genuine Leather","dimensions":"10x8x3 inch","strap":"Adjustable","color":"Brown"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.8, reviewCount: 145, soldCount: 340 },
    { name: "Denim Jacket Vintage Wash", slug: "denim-jacket-vintage-wash", description: "Classic denim jacket with vintage wash finish. Features button front, chest pockets, and adjustable waist tabs.", shortDescription: "Vintage wash denim jacket", price: 7999, comparePrice: 9999, costPrice: 3500, sku: "FASH-005", categoryId: 2, sellerId: 2, tags: "jacket,denim,outerwear,vintage,casual", attributes: '{"material":"100% Cotton Denim","wash":"Vintage","closure":"Button","fit":"Regular"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 112, soldCount: 280 },
    { name: "Silk Scarf Floral Print", slug: "silk-scarf-floral-print", description: "Luxurious 100% silk scarf with hand-rolled edges and vibrant floral print. Versatile styling options.", shortDescription: "100% silk floral print scarf", price: 3499, comparePrice: 4999, costPrice: 1500, sku: "FASH-006", categoryId: 2, sellerId: 2, tags: "scarf,silk,accessories,floral,fashion", attributes: '{"material":"100% Silk","size":"35x35 inch","edges":"Hand-rolled","care":"Dry clean"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.9, reviewCount: 87, soldCount: 190 },
    { name: "Athletic Joggers", slug: "athletic-joggers", description: "Comfortable athletic joggers with zippered pockets, tapered fit, and moisture-wicking fabric.", shortDescription: "Moisture-wicking athletic joggers", price: 3999, comparePrice: 5499, costPrice: 1700, sku: "FASH-007", categoryId: 2, sellerId: 2, tags: "joggers,athletic,pants,fitness,casual", attributes: '{"material":"Polyester Blend","fit":"Tapered","pockets":"Zippered","care":"Machine wash"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.6, reviewCount: 203, soldCount: 560 },
    { name: "Polarized Sunglasses", slug: "polarized-sunglasses", description: "UV400 polarized sunglasses with lightweight TR90 frame and scratch-resistant lenses.", shortDescription: "UV400 polarized sunglasses", price: 2999, comparePrice: 4499, costPrice: 1200, sku: "FASH-008", categoryId: 2, sellerId: 2, tags: "sunglasses,polarized,uv400,accessories,eyewear", attributes: '{"protection":"UV400","polarized":"Yes","frame":"TR90","weight":"25g"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.3, reviewCount: 156, soldCount: 720 },
    { name: "Wool Blend Overcoat", slug: "wool-blend-overcoat", description: "Sophisticated wool blend overcoat with notched lapels, button closure, and warm quilted lining.", shortDescription: "Wool blend overcoat with quilted lining", price: 14999, comparePrice: 19999, costPrice: 7000, sku: "FASH-009", categoryId: 2, sellerId: 2, tags: "coat,overcoat,wool,outerwear,formal", attributes: '{"material":"80% Wool 20% Poly","lining":"Quilted","length":"Mid-thigh","care":"Dry clean"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.7, reviewCount: 68, soldCount: 150 },
    { name: "Canvas Sneakers Low Top", slug: "canvas-sneakers-low-top", description: "Classic low-top canvas sneakers with vulcanized rubber sole. Timeless style for everyday wear.", shortDescription: "Classic low-top canvas sneakers", price: 4499, comparePrice: 5999, costPrice: 1800, sku: "FASH-010", categoryId: 2, sellerId: 2, tags: "sneakers,canvas,shoes,casual,classic", attributes: '{"upper":"Canvas","sole":"Rubber","closure":"Lace","colors":"White,Black,Navy"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 298, soldCount: 1100 },
    { name: "Leather Belt Reversible", slug: "leather-belt-reversible", description: "Genuine leather reversible belt. Black on one side, brown on the other. Silver-toned buckle.", shortDescription: "Reversible genuine leather belt", price: 3299, comparePrice: 4499, costPrice: 1400, sku: "FASH-011", categoryId: 2, sellerId: 2, tags: "belt,leather,accessories,reversible,formal", attributes: '{"material":"Genuine Leather","width":"1.3 inch","reversible":"Yes","sizes":"30-44"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.4, reviewCount: 134, soldCount: 450 },
    { name: "Casual Linen Shirt", slug: "casual-linen-shirt", description: "Breathable linen button-up shirt with relaxed fit. Perfect for summer days and beach vacations.", shortDescription: "Breathable linen casual shirt", price: 4499, comparePrice: 5999, costPrice: 2000, sku: "FASH-012", categoryId: 2, sellerId: 2, tags: "shirt,linen,casual,summer,breathable", attributes: '{"material":"100% Linen","fit":"Relaxed","sleeve":"Short","care":"Machine wash"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.6, reviewCount: 178, soldCount: 520 },

    // HOME & LIVING (categoryId 3)
    { name: "Ceramic Table Lamp Set", slug: "ceramic-table-lamp-set", description: "Set of 2 elegant ceramic table lamps with fabric shades. Perfect for bedside tables or living room end tables.", shortDescription: "Set of 2 ceramic table lamps", price: 5999, comparePrice: 7999, costPrice: 2600, sku: "HOME-001", categoryId: 3, sellerId: 3, tags: "lamp,lighting,ceramic,table-lamp,decor", attributes: '{"height":"22 inch","shade":"Fabric","base":"Ceramic","bulb":"E26"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.5, reviewCount: 89, soldCount: 210 },
    { name: "Memory Foam Pillow", slug: "memory-foam-pillow", description: "Premium memory foam pillow with cooling gel layer. Hypoallergenic cover, removable and washable.", shortDescription: "Cooling gel memory foam pillow", price: 3499, comparePrice: 4999, costPrice: 1500, sku: "HOME-002", categoryId: 3, sellerId: 3, tags: "pillow,memory-foam,sleep,bedding,cooling", attributes: '{"filling":"Memory Foam + Gel","cover":"Bamboo","firmness":"Medium","size":"Queen"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.7, reviewCount: 234, soldCount: 780 },
    { name: "Indoor Plant Pot Set", slug: "indoor-plant-pot-set", description: "Set of 3 minimalist ceramic plant pots with drainage holes and bamboo trays. Modern design for any home.", shortDescription: "Set of 3 ceramic plant pots with trays", price: 2999, comparePrice: 3999, costPrice: 1200, sku: "HOME-003", categoryId: 3, sellerId: 3, tags: "plant,pot,ceramic,indoor,garden,decor", attributes: '{"material":"Ceramic","sizes":"S/M/L","drainage":"Yes","tray":"Bamboo"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.8, reviewCount: 167, soldCount: 450 },
    { name: "Weighted Blanket 15lb", slug: "weighted-blanket-15lb", description: "Therapeutic 15-pound weighted blanket with soft microfiber cover. Promotes better sleep and reduces anxiety.", shortDescription: "15lb weighted blanket for better sleep", price: 6999, comparePrice: 9999, costPrice: 3200, sku: "HOME-004", categoryId: 3, sellerId: 3, tags: "blanket,weighted,sleep,therapeutic,comfort", attributes: '{"weight":"15 lbs","size":"48x72 inch","cover":"Microfiber","filling":"Glass beads"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 312, soldCount: 560 },
    { name: "Bamboo Cutting Board Set", slug: "bamboo-cutting-board-set", description: "Set of 3 organic bamboo cutting boards in assorted sizes. Natural antibacterial properties, gentle on knives.", shortDescription: "Set of 3 bamboo cutting boards", price: 2499, comparePrice: 3499, costPrice: 1000, sku: "HOME-005", categoryId: 3, sellerId: 3, tags: "cutting-board,bamboo,kitchen,cooking,organic", attributes: '{"material":"Bamboo","pieces":"3","sizes":"S/M/L","care":"Hand wash"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.5, reviewCount: 198, soldCount: 670 },
    { name: "Scented Candle Gift Set", slug: "scented-candle-gift-set", description: "Set of 4 hand-poured soy candles in elegant glass jars. Scents: Lavender, Vanilla, Sandalwood, and Fresh Linen.", shortDescription: "4-piece soy candle gift set", price: 3999, comparePrice: 5499, costPrice: 1700, sku: "HOME-006", categoryId: 3, sellerId: 3, tags: "candle,scented,soy,gift,home-fragrance", attributes: '{"material":"Soy Wax","burn":"40 hours each","scents":"4","jar":"Glass"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.9, reviewCount: 145, soldCount: 380 },
    { name: "Wall Art Canvas Print", slug: "wall-art-canvas-print", description: "Gallery-wrapped canvas print of an abstract landscape. Ready to hang, vibrant colors printed with archival inks.", shortDescription: "Abstract landscape canvas wall art", price: 4999, comparePrice: 6999, costPrice: 2200, sku: "HOME-007", categoryId: 3, sellerId: 3, tags: "wall-art,canvas,decor,painting,abstract", attributes: '{"size":"24x36 inch","material":"Canvas","frame":"Gallery wrap","hanging":"Ready"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.4, reviewCount: 76, soldCount: 180 },
    { name: "Kitchen Organizer Rack", slug: "kitchen-organizer-rack", description: "Expandable kitchen counter organizer with 3 tiers. Perfect for spices, jars, and condiments.", shortDescription: "Expandable 3-tier kitchen organizer", price: 2799, comparePrice: 3799, costPrice: 1200, sku: "HOME-008", categoryId: 3, sellerId: 3, tags: "organizer,kitchen,rack,spice,storage", attributes: '{"material":"Steel","tiers":"3","expandable":"Yes","finish":"Chrome"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.6, reviewCount: 156, soldCount: 420 },
    { name: "Throw Pillow Covers Set", slug: "throw-pillow-covers-set", description: "Set of 4 velvet throw pillow covers with hidden zipper. Soft, luxurious texture in modern geometric patterns.", shortDescription: "4 velvet throw pillow covers", price: 2299, comparePrice: 3299, costPrice: 900, sku: "HOME-009", categoryId: 3, sellerId: 3, tags: "pillow,covers,velvet,decor,cushion", attributes: '{"material":"Velvet","size":"18x18 inch","closure":"Hidden zipper","pieces":"4"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.7, reviewCount: 234, soldCount: 890 },
    { name: "Glass Food Storage Set", slug: "glass-food-storage-set", description: "10-piece glass food storage container set with airtight bamboo lids. Oven, microwave, and dishwasher safe.", shortDescription: "10pc glass storage with bamboo lids", price: 4499, comparePrice: 6499, costPrice: 2000, sku: "HOME-010", categoryId: 3, sellerId: 3, tags: "storage,glass,food-containers,kitchen,bamboo", attributes: '{"material":"Borosilicate Glass","pieces":"10","lids":"Bamboo","safe":"Oven/Microwave"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.8, reviewCount: 189, soldCount: 540 },
    { name: "LED Strip Lights 16ft", slug: "led-strip-lights-16ft", description: "16-foot RGB LED strip lights with remote control and music sync mode. Easy adhesive backing for installation.", shortDescription: "16ft RGB LED strip with music sync", price: 1999, comparePrice: 2999, costPrice: 800, sku: "HOME-011", categoryId: 3, sellerId: 3, tags: "led,strip-lights,rgb,decor,ambient", attributes: '{"length":"16 ft","colors":"16 million","control":"Remote + App","sync":"Music"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.4, reviewCount: 267, soldCount: 1200 },
    { name: "Bath Towel Set 6-Piece", slug: "bath-towel-set-6-piece", description: "Luxurious 6-piece bath towel set made from 100% Turkish cotton. Includes 2 bath, 2 hand, and 2 wash towels.", shortDescription: "6pc Turkish cotton bath towel set", price: 5499, comparePrice: 7999, costPrice: 2400, sku: "HOME-012", categoryId: 3, sellerId: 3, tags: "towels,bath,cotton,turkish,bathroom", attributes: '{"material":"Turkish Cotton","pieces":"6","gsm":"600","colors":"White/Gray"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 145, soldCount: 340 },

    // SPORTS & OUTDOORS (categoryId 4)
    { name: "Yoga Mat Non-Slip", slug: "yoga-mat-non-slip", description: "Extra thick 8mm TPE yoga mat with alignment lines. Non-slip surface on both sides, includes carrying strap.", shortDescription: "8mm non-slip TPE yoga mat", price: 2999, comparePrice: 4499, costPrice: 1300, sku: "SPORT-001", categoryId: 4, sellerId: 4, tags: "yoga,mat,fitness,exercise,non-slip", attributes: '{"thickness":"8mm","material":"TPE","size":"72x24 inch","lines":"Alignment"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.7, reviewCount: 289, soldCount: 780 },
    { name: "Resistance Bands Set", slug: "resistance-bands-set", description: "Set of 5 resistance bands with varying resistance levels. Includes handles, ankle straps, and door anchor.", shortDescription: "5-piece resistance band set", price: 1999, comparePrice: 2999, costPrice: 800, sku: "SPORT-002", categoryId: 4, sellerId: 4, tags: "resistance,bands,fitness,workout,home-gym", attributes: '{"bands":"5","resistance":"10-50 lbs","extras":"Handles,Anchor","material":"Latex"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 356, soldCount: 1100 },
    { name: "Camping Tent 4-Person", slug: "camping-tent-4-person", description: "Waterproof 4-person dome tent with rainfly, mesh windows, and easy 5-minute setup. Perfect for family camping.", shortDescription: "4-person waterproof dome tent", price: 12999, comparePrice: 17999, costPrice: 5800, sku: "SPORT-003", categoryId: 4, sellerId: 4, tags: "tent,camping,outdoor,4-person,waterproof", attributes: '{"capacity":"4 person","waterproof":"3000mm","setup":"5 min","weight":"4.5kg"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.6, reviewCount: 134, soldCount: 230 },
    { name: "Stainless Steel Water Bottle", slug: "stainless-steel-water-bottle", description: "Insulated stainless steel water bottle keeps drinks cold 24 hours or hot 12 hours. BPA-free, leak-proof lid.", shortDescription: "Insulated bottle, 24hr cold/12hr hot", price: 2499, comparePrice: 3499, costPrice: 1000, sku: "SPORT-004", categoryId: 4, sellerId: 4, tags: "water-bottle,insulated,stainless,hiking,gym", attributes: '{"capacity":"32 oz","material":"18/8 Steel","insulation":"Double wall","time":"24h cold"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.8, reviewCount: 412, soldCount: 1500 },
    { name: "Foam Roller Massage", slug: "foam-roller-massage", description: "High-density foam roller with textured surface for deep tissue massage. Ideal for post-workout recovery.", shortDescription: "High-density textured foam roller", price: 2299, comparePrice: 3299, costPrice: 900, sku: "SPORT-005", categoryId: 4, sellerId: 4, tags: "foam-roller,massage,recovery,fitness,therapy", attributes: '{"density":"High","surface":"Textured","length":"13 inch","material":"EVA"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.4, reviewCount: 178, soldCount: 560 },
    { name: "Hiking Backpack 40L", slug: "hiking-backpack-40l", description: "Ergonomic 40L hiking backpack with rain cover, hydration bladder compatibility, and multiple compartments.", shortDescription: "40L hiking backpack with rain cover", price: 6999, comparePrice: 9499, costPrice: 3000, sku: "SPORT-006", categoryId: 4, sellerId: 4, tags: "backpack,hiking,40l,outdoor,camping", attributes: '{"capacity":"40L","rain":"Included","hydration":"Compatible","weight":"1.2kg"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.7, reviewCount: 98, soldCount: 190 },
    { name: "Dumbbell Set Adjustable", slug: "dumbbell-set-adjustable", description: "Adjustable dumbbell set from 5 to 52.5 lbs per hand. Space-saving design replaces 15 sets of weights.", shortDescription: "Adjustable dumbbells 5-52.5 lbs", price: 29999, comparePrice: 39999, costPrice: 14000, sku: "SPORT-007", categoryId: 4, sellerId: 4, tags: "dumbbell,weights,adjustable,home-gym,fitness", attributes: '{"range":"5-52.5 lbs","adjustment":"Dial","base":"Included","pairs":"2"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.9, reviewCount: 156, soldCount: 280 },
    { name: "Cycling Helmet MIPS", slug: "cycling-helmet-mips", description: "Lightweight cycling helmet with MIPS safety system and 22 vents for maximum airflow. CPSC certified.", shortDescription: "MIPS cycling helmet with 22 vents", price: 5999, comparePrice: 8499, costPrice: 2600, sku: "SPORT-008", categoryId: 4, sellerId: 4, tags: "helmet,cycling,bike,mips,safety", attributes: '{"system":"MIPS","vents":"22","weight":"280g","cert":"CPSC"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 87, soldCount: 310 },
    { name: "Jump Rope Speed", slug: "jump-rope-speed", description: "Premium speed jump rope with ball bearings and adjustable cable. Perfect for cardio and CrossFit workouts.", shortDescription: "Speed jump rope with ball bearings", price: 1499, comparePrice: 2299, costPrice: 600, sku: "SPORT-009", categoryId: 4, sellerId: 4, tags: "jump-rope,speed,cardio,fitness,crossfit", attributes: '{"bearing":"Ball","cable":"Steel","adjustable":"Yes","handles":"Aluminum"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 234, soldCount: 890 },
    { name: "Sleeping Bag 3-Season", slug: "sleeping-bag-3-season", description: "3-season sleeping bag rated to 20°F. Mummy design with compression sack for backpacking.", shortDescription: "3-season sleeping bag, 20°F rating", price: 4999, comparePrice: 6999, costPrice: 2200, sku: "SPORT-010", categoryId: 4, sellerId: 4, tags: "sleeping-bag,camping,outdoor,3-season,backpacking", attributes: '{"rating":"20°F","shape":"Mummy","weight":"2.1 lbs","season":"3"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 112, soldCount: 250 },
    { name: "Fitness Tracker Watch", slug: "fitness-tracker-watch", description: "Affordable fitness tracker with heart rate monitor, sleep tracking, and 14 sport modes. 7-day battery life.", shortDescription: "Fitness tracker with HR and sleep", price: 3499, comparePrice: 4999, costPrice: 1500, sku: "SPORT-011", categoryId: 4, sellerId: 4, tags: "fitness-tracker,watch,heart-rate,sleep,sports", attributes: '{"modes":"14","battery":"7 days","water":"IP68","screen":"Color"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.3, reviewCount: 198, soldCount: 670 },
    { name: "Portable Hammock Double", slug: "portable-hammock-double", description: "Double camping hammock made from parachute nylon. Supports up to 500 lbs. Includes tree straps and carabiners.", shortDescription: "Double hammock, 500lb capacity", price: 2999, comparePrice: 4499, costPrice: 1200, sku: "SPORT-012", categoryId: 4, sellerId: 4, tags: "hammock,camping,outdoor,portable,relaxation", attributes: '{"capacity":"500 lbs","material":"Parachute Nylon","size":"Double","weight":"1.5 lbs"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.7, reviewCount: 145, soldCount: 380 },

    // BOOKS & MEDIA (categoryId 5)
    { name: "The Art of Design Hardcover", slug: "art-of-design-hardcover", description: "A comprehensive guide to modern design principles. Filled with stunning visuals and practical advice for designers.", shortDescription: "Comprehensive design principles guide", price: 3999, comparePrice: 5499, costPrice: 1800, sku: "BOOK-001", categoryId: 5, sellerId: 5, tags: "book,design,art,hardcover,education", attributes: '{"format":"Hardcover","pages":"320","language":"English","publisher":"Design Press"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.8, reviewCount: 67, soldCount: 180 },
    { name: "Science Fiction Collection", slug: "science-fiction-collection", description: "Box set of 5 classic science fiction novels. Beautifully bound editions with exclusive cover art.", shortDescription: "5 classic sci-fi novels box set", price: 4999, comparePrice: 6999, costPrice: 2200, sku: "BOOK-002", categoryId: 5, sellerId: 5, tags: "book,sci-fi,collection,classics,fiction", attributes: '{"format":"Hardcover","books":"5","pages":"1500 total","box":"Slipcase"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.6, reviewCount: 89, soldCount: 230 },
    { name: "Cookbook: World Flavors", slug: "cookbook-world-flavors", description: "Explore global cuisines with 200+ recipes from 50 countries. Stunning food photography throughout.", shortDescription: "200+ global recipes cookbook", price: 2999, comparePrice: 3999, costPrice: 1300, sku: "BOOK-003", categoryId: 5, sellerId: 5, tags: "cookbook,recipes,food,global,cooking", attributes: '{"format":"Hardcover","recipes":"200+","pages":"400","photos":"Full color"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.9, reviewCount: 156, soldCount: 450 },
    { name: "Mindfulness Journal", slug: "mindfulness-journal", description: "Guided daily journal for mindfulness and self-reflection. Includes prompts, quotes, and reflection spaces.", shortDescription: "Guided daily mindfulness journal", price: 1899, comparePrice: 2499, costPrice: 700, sku: "BOOK-004", categoryId: 5, sellerId: 5, tags: "journal,mindfulness,wellness,writing,reflection", attributes: '{"format":"Hardcover","pages":"365","size":"6x8 inch","ribbon":"Yes"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.7, reviewCount: 234, soldCount: 670 },
    { name: "Programming Mastery Guide", slug: "programming-mastery-guide", description: "Master modern programming with this comprehensive guide covering Python, JavaScript, and system design.", shortDescription: "Comprehensive programming guide", price: 4499, comparePrice: 5999, costPrice: 2000, sku: "BOOK-005", categoryId: 5, sellerId: 5, tags: "book,programming,coding,python,javascript", attributes: '{"format":"Paperback","pages":"800","level":"Intermediate","includes":"Code examples"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 178, soldCount: 340 },
    { name: "Children's Picture Book Set", slug: "children-picture-book-set", description: "Set of 6 beautifully illustrated children's books. Perfect for bedtime stories and early readers ages 3-7.", shortDescription: "6 illustrated children's books", price: 3499, comparePrice: 4799, costPrice: 1500, sku: "BOOK-006", categoryId: 5, sellerId: 5, tags: "book,children,picture-book,illustrated,kids", attributes: '{"format":"Hardcover","books":"6","ages":"3-7","pages":"32 each"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.8, reviewCount: 123, soldCount: 280 },
    { name: "Vinyl Record Player", slug: "vinyl-record-player", description: "Retro-style Bluetooth record player with built-in speakers. Plays 33/45/78 RPM records with auto-stop.", shortDescription: "Bluetooth vinyl record player", price: 7999, comparePrice: 10999, costPrice: 3500, sku: "BOOK-007", categoryId: 5, sellerId: 5, tags: "record-player,vinyl,bluetooth,audio,retro", attributes: '{"speed":"33/45/78","speakers":"Built-in","bluetooth":"Yes","output":"RCA"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.6, reviewCount: 89, soldCount: 190 },
    { name: "Biography: Innovators", slug: "biography-innovators", description: "Inspiring biographies of 20th century innovators who changed the world. Detailed and well-researched.", shortDescription: "Biographies of great innovators", price: 2799, comparePrice: 3799, costPrice: 1200, sku: "BOOK-008", categoryId: 5, sellerId: 5, tags: "book,biography,innovators,history,non-fiction", attributes: '{"format":"Hardcover","pages":"480","profiles":"20","photos":"Yes"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.4, reviewCount: 56, soldCount: 140 },
    { name: "Art Supplies Premium Set", slug: "art-supplies-premium-set", description: "Complete art set with 72 colored pencils, 48 watercolor pans, brushes, sketchbook, and carrying case.", shortDescription: "72 pencils + 48 watercolors art set", price: 5499, comparePrice: 7499, costPrice: 2400, sku: "BOOK-009", categoryId: 5, sellerId: 5, tags: "art,supplies,pencils,watercolor,creative", attributes: '{"pencils":"72","watercolors":"48","extras":"Brushes,Book","case":"Yes"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.7, reviewCount: 167, soldCount: 310 },
    { name: "Mystery Novel Collection", slug: "mystery-novel-collection", description: "Set of 4 bestselling mystery novels. Page-turning thrillers that will keep you guessing until the end.", shortDescription: "4 bestselling mystery novels", price: 3299, comparePrice: 4599, costPrice: 1400, sku: "BOOK-010", categoryId: 5, sellerId: 5, tags: "book,mystery,thriller,fiction,collection", attributes: '{"format":"Paperback","books":"4","pages":"1200 total","genre":"Mystery"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.5, reviewCount: 98, soldCount: 220 },
    { name: "Guitar for Beginners Book", slug: "guitar-beginners-book", description: "Learn guitar from scratch with this step-by-step guide. Includes chord charts, songs, and online video lessons.", shortDescription: "Step-by-step guitar learning guide", price: 1999, comparePrice: 2799, costPrice: 800, sku: "BOOK-011", categoryId: 5, sellerId: 5, tags: "book,guitar,music,learning,beginner", attributes: '{"format":"Spiral","pages":"200","videos":"Online","songs":"50"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.6, reviewCount: 145, soldCount: 380 },
    { name: "Self-Help: Growth Mindset", slug: "self-help-growth-mindset", description: "Transform your thinking and achieve your goals with proven strategies from psychology research.", shortDescription: "Psychology-based self-improvement", price: 2199, comparePrice: 2999, costPrice: 900, sku: "BOOK-012", categoryId: 5, sellerId: 5, tags: "book,self-help,psychology,growth,mindset", attributes: '{"format":"Hardcover","pages":"280","exercises":"Yes","research":"Backed"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.4, reviewCount: 112, soldCount: 260 },

    // HEALTH & BEAUTY (categoryId 6)
    { name: "Vitamin C Serum 30ml", slug: "vitamin-c-serum-30ml", description: "High-potency 20% Vitamin C serum with hyaluronic acid and Vitamin E. Brightens skin and reduces dark spots.", shortDescription: "20% Vitamin C serum with HA", price: 2499, comparePrice: 3499, costPrice: 1000, sku: "BEAUTY-001", categoryId: 6, sellerId: 3, tags: "skincare,vitamin-c,serum,brightening,anti-aging", attributes: '{"concentration":"20%","size":"30ml","extras":"HA + Vit E","type":"Serum"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.7, reviewCount: 312, soldCount: 890 },
    { name: "Natural Shampoo Bar", slug: "natural-shampoo-bar", description: "Eco-friendly solid shampoo bar made with natural ingredients. Lasts 80+ washes, zero plastic waste.", shortDescription: "Eco-friendly natural shampoo bar", price: 1299, comparePrice: 1799, costPrice: 500, sku: "BEAUTY-002", categoryId: 6, sellerId: 3, tags: "shampoo,bar,natural,eco-friendly,hair", attributes: '{"washes":"80+","plastic":"Zero","ingredients":"Natural","size":"80g"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 178, soldCount: 560 },
    { name: "Facial Cleansing Brush", slug: "facial-cleansing-brush", description: "Electric facial cleansing brush with 3 speed settings and soft silicone bristles. Waterproof for shower use.", shortDescription: "Electric silicone facial brush", price: 2999, comparePrice: 4299, costPrice: 1300, sku: "BEAUTY-003", categoryId: 6, sellerId: 3, tags: "skincare,cleansing,brush,facial,beauty", attributes: '{"speeds":"3","material":"Silicone","waterproof":"IPX7","battery":"USB"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 134, soldCount: 340 },
    { name: "Organic Lip Balm Set", slug: "organic-lip-balm-set", description: "Set of 4 organic lip balms in delicious flavors. Made with beeswax, coconut oil, and shea butter.", shortDescription: "4 organic lip balms set", price: 1499, comparePrice: 1999, costPrice: 600, sku: "BEAUTY-004", categoryId: 6, sellerId: 3, tags: "lip-balm,organic,skincare,natural,moisturizer", attributes: '{"organic":"Yes","pieces":"4","flavors":"Mixed","size":"4.5g each"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.8, reviewCount: 267, soldCount: 1200 },
    { name: "Essential Oil Diffuser", slug: "essential-oil-diffuser", description: "Ultrasonic essential oil diffuser with 7 color LED lights and auto shut-off. 300ml capacity, 10-hour runtime.", shortDescription: "Ultrasonic diffuser with LED lights", price: 3499, comparePrice: 4999, costPrice: 1500, sku: "BEAUTY-005", categoryId: 6, sellerId: 3, tags: "diffuser,essential-oils,aromatherapy,wellness,home", attributes: '{"capacity":"300ml","runtime":"10h","lights":"7 colors","auto":"Shut-off"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.6, reviewCount: 198, soldCount: 450 },
    { name: "Retinol Night Cream", slug: "retinol-night-cream", description: "Anti-aging retinol night cream with peptides and niacinamide. Reduces fine lines and improves skin texture.", shortDescription: "Retinol night cream with peptides", price: 3299, comparePrice: 4499, costPrice: 1400, sku: "BEAUTY-006", categoryId: 6, sellerId: 3, tags: "skincare,retinol,night-cream,anti-aging,peptides", attributes: '{"retinol":"0.5%","extras":"Peptides,Niacinamide","size":"50ml","use":"Night"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.5, reviewCount: 156, soldCount: 380 },
    { name: "Bath Bomb Gift Set", slug: "bath-bomb-gift-set", description: "12 handmade bath bombs with natural essential oils and moisturizing shea butter. Beautiful gift packaging.", shortDescription: "12 handmade bath bombs set", price: 2299, comparePrice: 3299, costPrice: 900, sku: "BEAUTY-007", categoryId: 6, sellerId: 3, tags: "bath-bomb,gift,set,relaxation,spa", attributes: '{"pieces":"12","material":"Natural","oils":"Essential","packaging":"Gift box"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.9, reviewCount: 234, soldCount: 670 },
    { name: "Hair Mask Treatment", slug: "hair-mask-treatment", description: "Deep conditioning hair mask with argan oil and keratin. Restores dry and damaged hair in 5 minutes.", shortDescription: "Argan oil hair mask treatment", price: 1899, comparePrice: 2699, costPrice: 800, sku: "BEAUTY-008", categoryId: 6, sellerId: 3, tags: "hair,mask,treatment,argan-oil,conditioning", attributes: '{"key":"Argan Oil + Keratin","time":"5 min","size":"250ml","type":"Deep mask"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.7, reviewCount: 189, soldCount: 520 },
    { name: "Electric Toothbrush", slug: "electric-toothbrush", description: "Sonic electric toothbrush with 5 cleaning modes and pressure sensor. 30-day battery life, travel case included.", shortDescription: "Sonic toothbrush with 5 modes", price: 4999, comparePrice: 6999, costPrice: 2200, sku: "BEAUTY-009", categoryId: 6, sellerId: 3, tags: "toothbrush,electric,sonic,dental,oral-care", attributes: '{"modes":"5","battery":"30 days","pressure":"Sensor","case":"Travel"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.6, reviewCount: 145, soldCount: 430 },
    { name: "Body Scrub Coconut", slug: "body-scrub-coconut", description: "Exfoliating body scrub with coconut oil and sugar. Leaves skin smooth, soft, and hydrated.", shortDescription: "Coconut sugar body scrub", price: 1699, comparePrice: 2399, costPrice: 700, sku: "BEAUTY-010", categoryId: 6, sellerId: 3, tags: "body-scrub,exfoliating,coconut,skincare,spa", attributes: '{"key":"Coconut Oil + Sugar","size":"300g","type":"Exfoliating","scent":"Coconut"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.5, reviewCount: 123, soldCount: 340 },
    { name: "Jade Roller & Gua Sha Set", slug: "jade-roller-gua-sha-set", description: "Authentic jade facial roller and gua sha scraping tool. Reduces puffiness and promotes lymphatic drainage.", shortDescription: "Jade roller + gua sha tool set", price: 1999, comparePrice: 2899, costPrice: 800, sku: "BEAUTY-011", categoryId: 6, sellerId: 3, tags: "jade-roller,gua-sha,skincare,facial,massage", attributes: '{"material":"Jade","pieces":"2","use":"Face + Neck","type":"Natural"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.4, reviewCount: 198, soldCount: 560 },
    { name: "Sunscreen SPF 50", slug: "sunscreen-spf-50", description: "Lightweight, non-greasy sunscreen with SPF 50 protection. Water-resistant for 80 minutes. reef-safe formula.", shortDescription: "SPF 50 reef-safe sunscreen", price: 1599, comparePrice: 2199, costPrice: 600, sku: "BEAUTY-012", categoryId: 6, sellerId: 3, tags: "sunscreen,spf50,skincare,protection,reef-safe", attributes: '{"spf":"50","type":"Mineral","water":"80 min","size":"100ml"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 267, soldCount: 780 },

    // TOYS & KIDS (categoryId 7)
    { name: "Wooden Building Blocks", slug: "wooden-building-blocks", description: "100-piece wooden building block set in various shapes and colors. Made from sustainably sourced wood, non-toxic paint.", shortDescription: "100pc wooden building blocks", price: 3499, comparePrice: 4799, costPrice: 1500, sku: "TOY-001", categoryId: 7, sellerId: 2, tags: "toys,blocks,wooden,building,kids,educational", attributes: '{"pieces":"100","material":"Wood","paint":"Non-toxic","age":"2+"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.8, reviewCount: 123, soldCount: 340 },
    { name: "Plush Teddy Bear Large", slug: "plush-teddy-bear-large", description: "Extra-large 24-inch plush teddy bear with super-soft fur. Perfect gift for all ages. Machine washable.", shortDescription: "24-inch super-soft teddy bear", price: 2999, comparePrice: 4299, costPrice: 1200, sku: "TOY-002", categoryId: 7, sellerId: 2, tags: "plush,teddy-bear,stuffed,toy,gift", attributes: '{"size":"24 inch","material":"Plush","wash":"Machine","age":"All"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.9, reviewCount: 234, soldCount: 560 },
    { name: "STEM Science Kit", slug: "stem-science-kit", description: "Educational STEM kit with 50+ experiments. Includes all materials and detailed instruction booklet.", shortDescription: "50+ experiment STEM science kit", price: 3999, comparePrice: 5499, costPrice: 1700, sku: "TOY-003", categoryId: 7, sellerId: 2, tags: "stem,science,educational,toy,learning,experiments", attributes: '{"experiments":"50+","material":"Safe","booklet":"Yes","age":"8+"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.7, reviewCount: 156, soldCount: 280 },
    { name: "Remote Control Car", slug: "remote-control-car", description: "High-speed RC car with 2.4GHz remote, 4WD, and off-road tires. Reaches speeds up to 20 mph.", shortDescription: "4WD high-speed RC car, 20mph", price: 4999, comparePrice: 6999, costPrice: 2200, sku: "TOY-004", categoryId: 7, sellerId: 2, tags: "rc-car,remote-control,toy,racing,off-road", attributes: '{"speed":"20 mph","drive":"4WD","remote":"2.4GHz","battery":"Rechargeable"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.5, reviewCount: 98, soldCount: 190 },
    { name: "Puzzle 1000 Pieces", slug: "puzzle-1000-pieces", description: "Beautiful 1000-piece jigsaw puzzle featuring a stunning landscape photograph. High-quality pieces with precision fit.", shortDescription: "1000-piece landscape puzzle", price: 1999, comparePrice: 2799, costPrice: 800, sku: "TOY-005", categoryId: 7, sellerId: 2, tags: "puzzle,jigsaw,1000-piece,hobby,game", attributes: '{"pieces":"1000","size":"27x20 inch","quality":"High","theme":"Landscape"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.6, reviewCount: 145, soldCount: 380 },
    { name: "Musical Keyboard Kids", slug: "musical-keyboard-kids", description: "37-key electronic keyboard for kids with recording function, 8 instrument sounds, and demo songs.", shortDescription: "37-key kids electronic keyboard", price: 3499, comparePrice: 4799, costPrice: 1500, sku: "TOY-006", categoryId: 7, sellerId: 2, tags: "keyboard,musical,toy,kids,piano,music", attributes: '{"keys":"37","sounds":"8","record":"Yes","power":"Battery/Adapter"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.4, reviewCount: 67, soldCount: 180 },
    { name: "Art Easel for Kids", slug: "art-easel-kids", description: "Double-sided adjustable art easel with chalkboard and whiteboard. Includes art supplies and paper roll.", shortDescription: "Double-sided kids art easel", price: 4499, comparePrice: 6299, costPrice: 1900, sku: "TOY-007", categoryId: 7, sellerId: 2, tags: "easel,art,kids,chalkboard,creative", attributes: '{"sides":"2","adjustable":"Yes","includes":"Supplies","height":"Up to 48"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.7, reviewCount: 89, soldCount: 210 },
    { name: "Baby Activity Gym", slug: "baby-activity-gym", description: "Soft padded activity gym with hanging toys, mirror, and tummy time pillow. Machine washable mat.", shortDescription: "Padded baby activity gym", price: 3999, comparePrice: 5499, costPrice: 1700, sku: "TOY-008", categoryId: 7, sellerId: 2, tags: "baby,activity-gym,toys,infant,play", attributes: '{"mat":"Padded","toys":"5 hanging","wash":"Machine","age":"0-12m"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 112, soldCount: 250 },
    { name: "Board Game Strategy", slug: "board-game-strategy", description: "Award-winning strategy board game for 2-4 players. Ages 10+, 60-90 minute playtime. Endless replayability.", shortDescription: "Award-winning strategy board game", price: 4499, comparePrice: 5999, costPrice: 1900, sku: "TOY-009", categoryId: 7, sellerId: 2, tags: "board-game,strategy,family,game-night,tabletop", attributes: '{"players":"2-4","age":"10+","time":"60-90 min","awards":"Yes"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.8, reviewCount: 234, soldCount: 450 },
    { name: "Drone Mini for Kids", slug: "drone-mini-kids", description: "Easy-to-fly mini drone with altitude hold, headless mode, and 360 flips. Perfect for beginners.", shortDescription: "Easy-fly mini drone for kids", price: 2999, comparePrice: 4299, costPrice: 1200, sku: "TOY-010", categoryId: 7, sellerId: 2, tags: "drone,mini,kids,toy,flying,remote", attributes: '{"mode":"Headless","flips":"360","hold":"Altitude","battery":"10 min"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.3, reviewCount: 156, soldCount: 320 },

    // FOOD & BEVERAGES (categoryId 8)
    { name: "Organic Green Tea Set", slug: "organic-green-tea-set", description: "Premium organic green tea sampler with 6 varieties from Japan and China. 60 tea bags in elegant tin.", shortDescription: "6 variety organic green tea set", price: 2499, comparePrice: 3499, costPrice: 1000, sku: "FOOD-001", categoryId: 8, sellerId: 5, tags: "tea,green-tea,organic,japanese,drink", attributes: '{"varieties":"6","bags":"60","organic":"Yes","origin":"Japan/China"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.7, reviewCount: 89, soldCount: 230 },
    { name: "Artisan Chocolate Box", slug: "artisan-chocolate-box", description: "Handcrafted artisan chocolate assortment with 24 pieces. Dark, milk, and white chocolate with unique fillings.", shortDescription: "24pc handcrafted chocolate box", price: 2999, comparePrice: 4299, costPrice: 1200, sku: "FOOD-002", categoryId: 8, sellerId: 5, tags: "chocolate,artisan,gift,dessert,gourmet", attributes: '{"pieces":"24","types":"Dark/Milk/White","handcrafted":"Yes","fillings":"Unique"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.9, reviewCount: 178, soldCount: 450 },
    { name: "Cold Brew Coffee Maker", slug: "cold-brew-coffee-maker", description: "Easy cold brew coffee maker with stainless steel filter. Makes 1 liter of smooth cold brew concentrate.", shortDescription: "1L cold brew coffee maker", price: 2799, comparePrice: 3999, costPrice: 1200, sku: "FOOD-003", categoryId: 8, sellerId: 5, tags: "coffee,cold-brew,maker,drink,kitchen", attributes: '{"capacity":"1 liter","filter":"Steel","time":"12-24h","material":"Glass"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 134, soldCount: 310 },
    { name: "Gourmet Spice Set", slug: "gourmet-spice-set", description: "Set of 12 premium spices from around the world. Includes recipe cards and refillable glass jars.", shortDescription: "12 premium spices from worldwide", price: 3499, comparePrice: 4799, costPrice: 1500, sku: "FOOD-004", categoryId: 8, sellerId: 5, tags: "spices,gourmet,cooking,set,kitchen", attributes: '{"spices":"12","jars":"Glass","cards":"Recipe","origin":"Global"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.8, reviewCount: 112, soldCount: 280 },
    { name: "Protein Powder Organic", slug: "protein-powder-organic", description: "Plant-based organic protein powder with 20g protein per serving. Vanilla flavor, no artificial sweeteners.", shortDescription: "Organic plant protein, 20g serving", price: 3999, comparePrice: 5499, costPrice: 1700, sku: "FOOD-005", categoryId: 8, sellerId: 5, tags: "protein,organic,plant,fitness,nutrition", attributes: '{"protein":"20g","flavor":"Vanilla","organic":"Yes","servings":"30"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.5, reviewCount: 198, soldCount: 560 },
    { name: "Honey Gift Set Raw", slug: "honey-gift-set-raw", description: "Collection of 4 raw honey varieties: wildflower, clover, manuka, and buckwheat. Beautifully packaged.", shortDescription: "4 raw honey varieties gift set", price: 3299, comparePrice: 4499, costPrice: 1400, sku: "FOOD-006", categoryId: 8, sellerId: 5, tags: "honey,raw,gift,organic,natural", attributes: '{"varieties":"4","type":"Raw","packaging":"Gift","origin":"Local"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.7, reviewCount: 87, soldCount: 190 },
    { name: "Olive Oil Extra Virgin", slug: "olive-oil-extra-virgin", description: "Cold-pressed extra virgin olive oil from Italy. Rich, fruity flavor perfect for cooking and dipping.", shortDescription: "Italian cold-pressed EVOO", price: 2299, comparePrice: 3199, costPrice: 900, sku: "FOOD-007", categoryId: 8, sellerId: 5, tags: "olive-oil,extra-virgin,italian,cooking,gourmet", attributes: '{"type":"Extra Virgin","process":"Cold-pressed","origin":"Italy","size":"500ml"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.6, reviewCount: 123, soldCount: 340 },
    { name: "Hot Sauce Collection", slug: "hot-sauce-collection", description: "Set of 5 artisan hot sauces ranging from mild to extreme heat. Made with fresh peppers and natural ingredients.", shortDescription: "5 artisan hot sauces set", price: 2499, comparePrice: 3499, costPrice: 1000, sku: "FOOD-008", categoryId: 8, sellerId: 5, tags: "hot-sauce,spicy,collection,gourmet,condiment", attributes: '{"sauces":"5","heat":"Mild-Extreme","natural":"Yes","size":"5oz each"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.8, reviewCount: 145, soldCount: 380 },

    // AUTOMOTIVE (categoryId 9)
    { name: "Car Phone Mount", slug: "car-phone-mount", description: "Universal car phone mount with strong suction cup and 360-degree rotation. Fits all phones 4-7 inches.", shortDescription: "Universal car mount, 360 rotation", price: 1699, comparePrice: 2499, costPrice: 700, sku: "AUTO-001", categoryId: 9, sellerId: 4, tags: "car,mount,phone,holder,dashboard", attributes: '{"fit":"4-7 inch","rotation":"360°","mount":"Suction","material":"ABS"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.4, reviewCount: 312, soldCount: 1200 },
    { name: "Car Vacuum Cleaner", slug: "car-vacuum-cleaner", description: "High-power handheld car vacuum with HEPA filter and LED light. 12V DC powered from car outlet.", shortDescription: "High-power handheld car vacuum", price: 2999, comparePrice: 4299, costPrice: 1200, sku: "AUTO-002", categoryId: 9, sellerId: 4, tags: "car,vacuum,cleaner,hepa,portable", attributes: '{"power":"120W","filter":"HEPA","light":"LED","cord":"16ft"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.3, reviewCount: 178, soldCount: 450 },
    { name: "Seat Covers Universal", slug: "seat-covers-universal", description: "Full set of 5 universal seat covers in premium faux leather. Easy installation, airbag compatible.", shortDescription: "5pc universal faux leather covers", price: 5999, comparePrice: 8499, costPrice: 2600, sku: "AUTO-003", categoryId: 9, sellerId: 4, tags: "seat-covers,car,interior,leather,protection", attributes: '{"pieces":"5","material":"Faux Leather","fit":"Universal","airbag":"Compatible"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 89, soldCount: 230 },
    { name: "Dash Cam Front & Rear", slug: "dash-cam-front-rear", description: "Dual dash cam with 1080p front and rear cameras. Loop recording, G-sensor, and night vision.", shortDescription: "1080p dual dash cam with night vision", price: 6999, comparePrice: 9999, costPrice: 3000, sku: "AUTO-004", categoryId: 9, sellerId: 4, tags: "dash-cam,camera,car,dvr,safety", attributes: '{"front":"1080p","rear":"1080p","night":"Yes","screen":"3 inch"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.6, reviewCount: 134, soldCount: 310 },

    // JEWELRY & WATCHES (categoryId 10)
    { name: "Minimalist Watch Silver", slug: "minimalist-watch-silver", description: "Elegant minimalist wristwatch with Japanese quartz movement and genuine leather strap. Water resistant 30m.", shortDescription: "Minimalist quartz watch, leather strap", price: 5999, comparePrice: 8499, costPrice: 2500, sku: "JEW-001", categoryId: 10, sellerId: 2, tags: "watch,minimalist,silver,quartz,leather", attributes: '{"movement":"Quartz","strap":"Leather","water":"30m","diameter":"40mm"}', status: "active" as const, isFeatured: true, isTrending: false, rating: 4.7, reviewCount: 98, soldCount: 280 },
    { name: "Gold Chain Necklace", slug: "gold-chain-necklace", description: "14K gold-plated chain necklace, 18 inches. Hypoallergenic, tarnish-resistant. Perfect for layering.", shortDescription: "14K gold-plated chain necklace", price: 3999, comparePrice: 5499, costPrice: 1500, sku: "JEW-002", categoryId: 10, sellerId: 2, tags: "necklace,gold,chain,jewelry,fashion", attributes: '{"plating":"14K Gold","length":"18 inch","type":"Hypoallergenic","style":"Layering"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.5, reviewCount: 112, soldCount: 340 },
    { name: "Stud Earrings Crystal", slug: "stud-earrings-crystal", description: "Sparkling crystal stud earrings set in sterling silver. 6mm round-cut stones with secure butterfly backs.", shortDescription: "Crystal stud earrings, sterling silver", price: 2499, comparePrice: 3499, costPrice: 1000, sku: "JEW-003", categoryId: 10, sellerId: 2, tags: "earrings,stud,crystal,silver,jewelry", attributes: '{"stone":"Crystal","setting":"Sterling Silver","size":"6mm","backs":"Butterfly"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.8, reviewCount: 167, soldCount: 560 },
    { name: "Leather Bracelet Men", slug: "leather-bracelet-men", description: "Handcrafted men's leather bracelet with stainless steel magnetic clasp. Available in brown and black.", shortDescription: "Handcrafted leather men's bracelet", price: 1999, comparePrice: 2799, costPrice: 800, sku: "JEW-004", categoryId: 10, sellerId: 2, tags: "bracelet,leather,men,jewelry,accessory", attributes: '{"material":"Leather","clasp":"Magnetic","metal":"Steel","colors":"Brown/Black"}', status: "active" as const, isFeatured: false, isTrending: true, rating: 4.4, reviewCount: 89, soldCount: 230 },
    { name: "Smart Watch Band Set", slug: "smart-watch-band-set", description: "3-pack silicone sport bands compatible with major smartwatches. Quick-release pins for easy swapping.", shortDescription: "3 silicone smartwatch sport bands", price: 1699, comparePrice: 2499, costPrice: 700, sku: "JEW-005", categoryId: 10, sellerId: 1, tags: "watch-band,smartwatch,silicone,sport,strap", attributes: '{"pieces":"3","material":"Silicone","compatible":"Universal","release":"Quick"}', status: "active" as const, isFeatured: false, isTrending: false, rating: 4.6, reviewCount: 234, soldCount: 780 },
    { name: "Pearl Drop Earrings", slug: "pearl-drop-earrings", description: "Elegant freshwater pearl drop earrings with gold-plated hooks. Perfect for weddings and formal events.", shortDescription: "Freshwater pearl drop earrings", price: 3499, comparePrice: 4799, costPrice: 1400, sku: "JEW-006", categoryId: 10, sellerId: 2, tags: "earrings,pearl,drop,gold,elegant", attributes: '{"pearl":"Freshwater","hook":"Gold-plated","length":"1.5 inch","occasion":"Formal"}', status: "active" as const, isFeatured: true, isTrending: true, rating: 4.9, reviewCount: 78, soldCount: 190 },
  ];

  // Add accurate Unsplash image URLs for each product
  const productsWithImages = productData.map((p) => ({
    ...p,
    imageUrl:
      PRODUCT_IMAGE_MAP[p.slug] ||
      (CATEGORY_GALLERY_IMAGES as any)[p.categoryId]?.[0] ||
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
  }));

  for (let idx = 0; idx < productsWithImages.length; idx++) {
    const product = productsWithImages[idx];
    const { imageUrl, ...productInsert } = product;
    await db.insert(products).values(productInsert);
    const insertedProduct = await db.select().from(products).where(eq(products.slug, product.slug)).limit(1);
    const insertedId = Number(insertedProduct[0]?.id ?? 0);
    if (!insertedId) {
      throw new Error(`Failed to insert product ${product.slug}`);
    }

    // Insert product image
    await db.insert(productImages).values({
      productId: insertedId,
      imageUrl,
      altText: product.name,
      isPrimary: true,
      sortOrder: 0,
    });

    // Insert 3 additional gallery images per product
    const categorySet = CATEGORY_GALLERY_IMAGES[product.categoryId] || [imageUrl];
    for (let j = 1; j <= 3; j++) {
      const extraUrl = categorySet[j] || categorySet[0] || imageUrl;
      await db.insert(productImages).values({
        productId: insertedId,
        imageUrl: extraUrl,
        altText: `${product.name} photo ${j + 1}`,
        isPrimary: false,
        sortOrder: j,
      });
    }

    // Insert inventory
    await db.insert(inventory).values({
      productId: insertedId,
      quantity: Math.floor(Math.random() * 200) + 20,
      lowStockThreshold: Math.floor(Math.random() * 10) + 5,
      warehouseLocation: `WH-${String.fromCharCode(65 + Math.floor(Math.random() * 4))}-${Math.floor(Math.random() * 100) + 1}`,
    });
  }

  const allProducts = await db.select().from(products);
  console.log(`Created ${allProducts.length} products with images and inventory`);

  // ============================================================
  // 4. CREATE ORDERS
  // ============================================================
  console.log("Creating sample orders...");
  const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
  const sellerStatuses = ["pending", "accepted", "handed_over"] as const;
  const couriers = ["Pathao Express", "Steadfast Courier", "Paperfly Logistics", "RedX Logistics"];
  const cities = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna"];

  const orderData = [];
  const targetUserIds = [1, 2, 3, 4, 5, 6, 7]; // Includes Admin User (6) and Test Customer (7)

  for (let i = 0; i < 35; i++) {
    const status = orderStatuses[i % orderStatuses.length];
    const sellerStatus = status === "pending" ? "pending" : status === "processing" ? "accepted" : status === "shipped" || status === "delivered" ? "handed_over" : "denied";
    const city = cities[i % cities.length];
    const isInsideDhaka = city === "Dhaka";
    const estimatedDays = isInsideDhaka ? 2 : 4;
    const totalAmount = Math.floor(Math.random() * 3000) + 500;
    const userId = targetUserIds[i % targetUserIds.length];

    orderData.push({
      orderNumber: `ORD-2024-${String(i + 1).padStart(4, "0")}`,
      userId,
      totalAmount,
      taxAmount: totalAmount * 0.08,
      shippingAmount: isInsideDhaka ? 60 : 120,
      status,
      sellerStatus,
      courierName: sellerStatus !== "pending" ? couriers[i % couriers.length] : undefined,
      estimatedDeliveryDays: estimatedDays,
      estimatedDeliveryDate: Date.now() + estimatedDays * 86400000,
      trackingNumber: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentStatus: status === "cancelled" ? "failed" as const : "paid" as const,
      paymentMethod: ["bkash", "nagad", "cod", "credit_card"][i % 4],
      shippingAddress: `${Math.floor(Math.random() * 99) + 1} Road ${Math.floor(Math.random() * 20) + 1}, Sector ${Math.floor(Math.random() * 14) + 1}`,
      shippingCity: city,
      shippingCountry: "Bangladesh",
      shippingPostalCode: String(Math.floor(Math.random() * 8000) + 1000),
    });
  }

  const insertedOrders = await db.insert(orders).values(orderData);
  const allOrders = await db.select().from(orders);
  console.log(`Created ${allOrders.length} orders`);

  // Create order items
  const orderItemsData = [];
  for (const order of allOrders) {
    const numItems = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numItems; j++) {
      const product = allProducts[(order.id + j) % allProducts.length];
      const quantity = Math.floor(Math.random() * 2) + 1;
      orderItemsData.push({
        orderId: order.id,
        productId: product.id,
        sellerId: product.sellerId,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity,
      });
    }
  }
  await db.insert(orderItems).values(orderItemsData);
  console.log(`Created ${orderItemsData.length} order items`);

  // ============================================================
  // 5. CREATE REVIEWS
  // ============================================================
  console.log("Creating reviews...");
  const reviewComments = [
    "Absolutely love this product! Exceeded my expectations.",
    "Great quality for the price. Would definitely recommend.",
    "Fast shipping and excellent customer service.",
    "The product works exactly as described. Very satisfied!",
    "Beautiful design and high quality materials. Love it!",
    "Good product but took a while to arrive.",
    "Perfect! Exactly what I was looking for.",
    "Amazing quality, will buy again for sure.",
    "Decent product, could be better packaging.",
    "Best purchase I've made this year! Highly recommended.",
  ];

  const reviewTitles = [
    "Excellent!", "Great Buy", "Love It", "Perfect", "Amazing Quality",
    "Worth Every Penny", "Highly Recommend", "Fantastic", "Superb", "Outstanding",
  ];

  const reviewData = [];
  for (let i = 0; i < 80; i++) {
    const product = allProducts[i % allProducts.length];
    reviewData.push({
      productId: product.id,
      userId: targetUserIds[i % targetUserIds.length],
      orderId: allOrders[i % allOrders.length].id,
      rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
      title: reviewTitles[i % reviewTitles.length],
      comment: reviewComments[i % reviewComments.length],
      isVerified: true,
      helpful: Math.floor(Math.random() * 50),
    });
  }
  await db.insert(reviews).values(reviewData);
  const allReviews = await db.select().from(reviews);
  console.log(`Created ${allReviews.length} reviews`);

  // ============================================================
  // 6. CREATE WISHLIST ITEMS
  // ============================================================
  console.log("Creating wishlist items...");
  const wishlistData = [];
  for (let i = 0; i < 50; i++) {
    const product = allProducts[(i * 3) % allProducts.length];
    wishlistData.push({
      userId: targetUserIds[i % targetUserIds.length],
      productId: product.id,
    });
  }
  await db.insert(wishlist).values(wishlistData);
  console.log(`Created ${wishlistData.length} wishlist items`);

  // ============================================================
  // 7. CREATE ACTIVE CARTS & CART ITEMS
  // ============================================================
  console.log("Creating active carts...");
  for (const uId of targetUserIds) {
    const cartRes = await db.insert(carts).values({ userId: uId });
    const cartId = Number(cartRes[0].insertId);
    await db.insert(cartItems).values([
      { cartId, productId: allProducts[uId % allProducts.length].id, quantity: 1 },
      { cartId, productId: allProducts[(uId + 3) % allProducts.length].id, quantity: 2 },
    ]);
  }
  console.log("Created carts & cart items for all users");

  // ============================================================
  // 8. NOTIFICATIONS DELETED (NOW DYNAMIC)
  // ============================================================
  console.log("Skipping mock notifications (system is now fully dynamic)...");

  // ============================================================
  // 8. CREATE SUPPORT KNOWLEDGE BASE
  // ============================================================
  console.log("Creating support knowledge base...");
  const supportKnowledgeData = [
    // Order Tracking
    {
      question: "Where is my order?",
      answer: "I can help you track your order! Please provide your order number (e.g., ORD-2024-0001) or I can show you your recent orders if you're logged in.",
      category: "orders",
      keywords: "order,track,where,status,shipping,delivery",
      priority: 10,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "How do I track my order?",
      answer: "You can track your order by providing your order number. If you're logged in, I can also show you your recent orders with one-click tracking.",
      category: "orders",
      keywords: "track,order,tracking,how,find",
      priority: 9,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "What is my order status?",
      answer: "Your order status can be: Pending (being processed), Confirmed (payment verified), Processing (preparing for shipment), Shipped (on the way with tracking), Delivered (arrived), or Cancelled. Provide your order number for exact status.",
      category: "orders",
      keywords: "status,order,what,pending,shipped,delivered",
      priority: 8,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "When will my order arrive?",
      answer: "Delivery time depends on order status: Processing orders take 5-7 business days, Shipped orders take 2-3 business days. Express shipping (1-2 days) is available for BDT 200 extra. Free standard shipping on orders over BDT 5,000.",
      category: "orders",
      keywords: "when,arrive,delivery,time,long,take",
      priority: 8,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Can I cancel my order?",
      answer: "Orders can be cancelled if they're still Pending, Confirmed, or Processing. Once shipped, you'll need to wait for delivery and then initiate a return if needed. Provide your order number to check eligibility.",
      category: "orders",
      keywords: "cancel,order,stop,return",
      priority: 7,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Shipping
    {
      question: "How much is shipping?",
      answer: "Standard shipping is BDT 99. Free shipping on orders over BDT 5,000. Express shipping (1-2 business days) is BDT 299. COD orders have a BDT 50 handling fee.",
      category: "shipping",
      keywords: "shipping,cost,price,fee,free,express",
      priority: 10,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Do you offer free shipping?",
      answer: "Yes! Free standard shipping on all orders over BDT 5,000. No coupon code needed - it's applied automatically at checkout.",
      category: "shipping",
      keywords: "free,shipping,delivery,offer",
      priority: 9,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "How long does shipping take?",
      answer: "Standard shipping: 3-7 business days. Express shipping: 1-2 business days (BDT 299 extra). Orders placed before 2 PM ship same day. Remote areas may take 1-2 extra days.",
      category: "shipping",
      keywords: "long,shipping,take,time,days,fast",
      priority: 9,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Can I change my shipping address?",
      answer: "You can change your shipping address if the order is still Pending or Confirmed. Once Processing or Shipped, address changes aren't possible. Contact us immediately with your order number.",
      category: "shipping",
      keywords: "change,address,shipping,modify,update",
      priority: 6,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Returns & Refunds
    {
      question: "What is your return policy?",
      answer: "30-day return policy from delivery date. Items must be unused, in original packaging with tags. Refunds issued to original payment method within 5-10 business days after we receive the return. Return shipping is free for defective/wrong items.",
      category: "returns",
      keywords: "return,policy,refund,exchange,days,condition",
      priority: 10,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "How do I return an item?",
      answer: "To return an item: 1) Go to your Orders page, 2) Click 'Return' on the eligible order, 3) Select reason and items, 4) Print return label, 5) Drop off at courier. We'll process refund within 5-10 days of receiving it.",
      category: "returns",
      keywords: "how,return,item,process,steps,label",
      priority: 9,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "How long for refund?",
      answer: "Refunds are processed within 5-10 business days after we receive your return. The refund appears in your account within 3-5 additional business days depending on your bank/payment provider.",
      category: "returns",
      keywords: "refund,long,time,days,process,money",
      priority: 8,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Can I exchange instead of return?",
      answer: "Yes! During the return process, select 'Exchange' instead of 'Refund'. You can choose a different size, color, or variant of the same product. Price differences will be charged/refunded accordingly.",
      category: "returns",
      keywords: "exchange,instead,return,size,color,variant",
      priority: 7,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Payments
    {
      question: "What payment methods do you accept?",
      answer: "We accept: Cash on Delivery (COD - BDT 50 fee), Credit/Debit Cards (Visa, Mastercard, Amex), bKash, Nagad, Rocket, and Bank Transfer. All online payments are secured with SSL encryption.",
      category: "payments",
      keywords: "payment,method,accept,cod,card,bkash,nagad,rocket",
      priority: 10,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Is Cash on Delivery available?",
      answer: "Yes! COD is available for orders up to BDT 50,000. There's a BDT 50 handling fee. You pay when the package arrives. Available in most areas - check at checkout.",
      category: "payments",
      keywords: "cod,cash,delivery,available,fee,limit",
      priority: 9,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "My payment failed, what do I do?",
      answer: "If payment fails: 1) Check card details and balance, 2) Try a different payment method, 3) Contact your bank for international/online transaction blocks, 4) For COD, ensure you have exact change. Your cart is saved for 30 minutes.",
      category: "payments",
      keywords: "payment,failed,error,declined,what,do",
      priority: 8,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Is my payment secure?",
      answer: "Absolutely! All payments are processed through PCI-DSS compliant payment gateways. We never store your full card details. SSL encryption protects all transactions. Look for the padlock icon in your browser.",
      category: "payments",
      keywords: "secure,safe,payment,security,ssl,protect",
      priority: 7,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Account
    {
      question: "How do I reset my password?",
      answer: "Click 'Forgot Password' on the login page. Enter your registered email. You'll receive a reset link valid for 1 hour. If you don't see the email, check spam folder or contact support.",
      category: "account",
      keywords: "reset,password,forgot,login,email,link",
      priority: 10,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "How do I create an account?",
      answer: "Click 'Sign Up' in the header. Enter your name, email, phone, and password. You'll receive a verification email. Once verified, you can track orders, save wishlist, and checkout faster.",
      category: "account",
      keywords: "create,account,sign,up,register,verify",
      priority: 8,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Can I delete my account?",
      answer: "Yes, you can request account deletion from Settings > Privacy. Note: This permanently removes all your data including order history, wishlist, and reviews. Active orders must be completed first.",
      category: "account",
      keywords: "delete,account,remove,privacy,data",
      priority: 5,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Products
    {
      question: "How do I find my size?",
      answer: "Check the size guide on each product page (click 'Size Guide' near size options). Measure yourself and compare to the chart. For clothing, consider fit type (slim, regular, relaxed). Reviews often mention sizing.",
      category: "products",
      keywords: "size,find,guide,fit,measure,chart",
      priority: 9,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Is this product in stock?",
      answer: "Stock status shows on the product page. 'In Stock' = available. 'Low Stock' = few left. 'Out of Stock' = unavailable. You can click 'Notify Me' on out-of-stock items to get an email when restocked.",
      category: "products",
      keywords: "stock,available,in stock,out of stock,notify",
      priority: 8,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Can I see more product photos?",
      answer: "Click on the main product image to open the gallery. You'll see multiple angles, zoom views, and sometimes lifestyle photos. On mobile, swipe through images. Reviews may also have customer photos.",
      category: "products",
      keywords: "photo,image,picture,see,more,gallery,zoom",
      priority: 6,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Sellers
    {
      question: "How do I contact a seller?",
      answer: "Go to the product page or your order details and click 'Contact Seller'. You can send messages directly. Sellers typically respond within 24 hours. For urgent issues, contact our support team.",
      category: "sellers",
      keywords: "contact,seller,message,communicate,question",
      priority: 8,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "How do I become a seller?",
      answer: "Click 'Become a Seller' in the footer or go to /seller/register. You'll need: business registration, bank account, tax ID, and product catalog. Approval takes 2-3 business days. Commission starts at 5%.",
      category: "sellers",
      keywords: "become,seller,register,business,commission,apply",
      priority: 6,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Wishlist
    {
      question: "How does wishlist work?",
      answer: "Click the heart icon on any product to save it. Access your wishlist from the header (heart icon) or your dashboard. Items stay saved until you remove them. You can move items to cart or share your wishlist.",
      category: "wishlist",
      keywords: "wishlist,work,save,heart,icon,share",
      priority: 7,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Cart
    {
      question: "My cart is empty, where did my items go?",
      answer: "Cart items are saved for 30 days. If you were logged out, items may not persist across devices. Log in to preserve your cart. Check if items went out of stock - they're auto-removed.",
      category: "cart",
      keywords: "cart,empty,items,gone,disappeared,save",
      priority: 7,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Discounts
    {
      question: "Do you have any discounts?",
      answer: "Check the homepage for current promotions! Subscribe to our newsletter for exclusive deals. First-time customers get 10% off with code WELCOME10. Seasonal sales: Eid, New Year, Black Friday, Anniversary.",
      category: "discounts",
      keywords: "discount,coupon,promo,offer,sale,deal,code",
      priority: 9,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "How do I apply a coupon code?",
      answer: "At checkout, enter your coupon code in the 'Promo Code' box and click 'Apply'. The discount shows in your order summary. Only one code per order. Codes are case-insensitive but must be exact.",
      category: "discounts",
      keywords: "apply,coupon,code,promo,checkout,discount",
      priority: 8,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // Complaints
    {
      question: "I received a damaged item",
      answer: "I'm sorry! Please: 1) Take photos of the damage and packaging, 2) Contact us within 48 hours with order number and photos, 3) We'll arrange replacement or full refund (no return needed for damaged items).",
      category: "complaints",
      keywords: "damaged,broken,defective,wrong,item,received",
      priority: 10,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "I received the wrong item",
      answer: "Apologies for the mistake! Contact us with your order number and a photo of what you received. We'll send the correct item immediately with a prepaid return label for the wrong item. No cost to you.",
      category: "complaints",
      keywords: "wrong,item,received,mistake,incorrect",
      priority: 9,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },

    // General
    {
      question: "Hello",
      answer: "Hello! I'm your 24/7 AI Customer Support Assistant. I can help with orders, shipping, payments, returns, and more. How can I assist you today?",
      category: "greeting",
      keywords: "hello,hi,hey,greetings,good morning,afternoon,evening",
      priority: 10,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
    {
      question: "Thank you",
      answer: "You're welcome! I'm here 24/7 if you need anything else. Have a great day!",
      category: "goodbye",
      keywords: "thanks,thank you,bye,goodbye,see you,that's all",
      priority: 10,
      isActive: 1,
      source: "manual",
      usageCount: 0,
    },
  ];

  await db.insert(supportKnowledge).values(supportKnowledgeData);
  console.log(`Created ${supportKnowledgeData.length} support knowledge entries`);

  const escalationTicketData = [
    {
      ticketNumber: "TICK-84901",
      sessionId: "sess_test_101",
      userId: 5,
      userMessage: "My order #ORD-84901 hasn't arrived after 7 days and I want a full refund immediately!",
      aiResponse: "I understand your concern. Since your request exceeds standard policy limits, I am escalating this to our human support team.",
      aiConfidence: 0.45,
      escalationReason: "Customer requested full refund & expresses high urgency",
      sentimentScore: -0.8,
      status: "open",
      priority: "high",
    },
    {
      ticketNumber: "TICK-84902",
      sessionId: "sess_test_102",
      userId: 5,
      userMessage: "Received damaged product package with broken screen.",
      aiResponse: "I am sorry to hear that. I have logged an urgent ticket for our admin inspection team.",
      aiConfidence: 0.6,
      escalationReason: "Damaged item replacement request",
      sentimentScore: -0.6,
      status: "in_progress",
      priority: "urgent",
    },
    {
      ticketNumber: "TICK-84903",
      sessionId: "sess_test_103",
      userId: 5,
      userMessage: "I need help changing my delivery address for order #ORD-84903.",
      aiResponse: "Address modification request logged for admin review.",
      aiConfidence: 0.9,
      escalationReason: "Address modification request",
      sentimentScore: 0.1,
      status: "resolved",
      priority: "medium",
    },
  ];

  await db.insert(escalationTickets).values(escalationTicketData as any);
  console.log(`Created ${escalationTicketData.length} escalation support tickets`);

  console.log("\nSeed complete! Database populated with:");
  console.log(`- ${allCategories.length} categories`);
  console.log(`- ${allSellers.length} sellers`);
  console.log(`- ${allProducts.length} products`);
  console.log(`- ${allOrders.length} orders`);
  console.log(`- ${orderItemsData.length} order items`);
  console.log(`- ${allReviews.length} reviews`);
  console.log(`- ${wishlistData.length} wishlist items`);
  console.log(`- ${escalationTicketData.length} escalation tickets`);

  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});
