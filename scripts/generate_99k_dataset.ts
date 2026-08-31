import fs from "fs";
import path from "path";
import { getDb } from "../api/queries/connection.ts";
import * as schema from "../db/schema.ts";
import { eq } from "../db/mysql.ts";

// 100 E-Commerce Categories across 10 main verticals
const CATEGORIES = [
  // Electronics & Gadgets (1-10)
  { name: "Mobiles & Smartphones", icon: "Smartphone", desc: "Latest Android & iOS smartphones" },
  { name: "Laptops & Computers", icon: "Laptop", desc: "Workstation laptops, ultrabooks & PCs" },
  { name: "Audio & Headphones", icon: "Headphones", desc: "Wireless earbuds, Bluetooth speakers & headsets" },
  { name: "Smartwatches & Wearables", icon: "Watch", desc: "Fitness trackers, smartwatches & bands" },
  { name: "Gaming & Consoles", icon: "Gamepad2", desc: "Consoles, gaming gear & accessories" },
  { name: "Cameras & Photography", icon: "Camera", desc: "DSLR, mirrorless cameras & lenses" },
  { name: "TV & Home Entertainment", icon: "Tv", desc: "Smart TVs, soundbars & streaming devices" },
  { name: "Kitchen & Home Appliances", icon: "Zap", desc: "Blenders, microwave ovens & air fryers" },
  { name: "Computer Accessories", icon: "Mouse", desc: "Keyboards, mice, monitors & storage" },
  { name: "Smart Home & Automation", icon: "Home", desc: "Smart plugs, security cameras & lights" },

  // Fashion & Apparel (11-20)
  { name: "Men's Casual Wear", icon: "Shirt", desc: "T-shirts, polo shirts & casual trousers" },
  { name: "Women's Ethnic Wear", icon: "Sparkles", desc: "Sarees, salwar kameez & kurti sets" },
  { name: "Men's Traditional Wear", icon: "UserCheck", desc: "Panjabi, pajama & kabli sets" },
  { name: "Women's Western Wear", icon: "Sparkles", desc: "Tops, dresses, jeans & jackets" },
  { name: "Men's Footwear", icon: "Footprints", desc: "Sneakers, formal shoes & sandals" },
  { name: "Women's Footwear", icon: "Footprints", desc: "Heels, flats, boots & casual shoes" },
  { name: "Bags & Backpacks", icon: "Briefcase", desc: "Travel backpacks, handbags & wallets" },
  { name: "Jewelry & Ornaments", icon: "Gem", desc: "Gold plated, silver & costume jewelry" },
  { name: "Watches & Clocks", icon: "Clock", desc: "Luxury, casual & digital watches" },
  { name: "Eyewear & Sunglasses", icon: "Glasses", desc: "Polarized sunglasses & optical frames" },

  // Home & Living (21-30)
  { name: "Living Room Furniture", icon: "Armchair", desc: "Sofas, center tables & TV cabinets" },
  { name: "Bedroom Furniture", icon: "Bed", desc: "Beds, wardrobes & dressing tables" },
  { name: "Bedding & Linens", icon: "Square", desc: "Bedsheets, comforters & pillows" },
  { name: "Kitchenware & Cookware", icon: "Utensils", desc: "Pots, pans, pressure cookers & cutlery" },
  { name: "Dining & Tableware", icon: "Coffee", desc: "Dinner sets, glass sets & tea sets" },
  { name: "Home Decor & Wall Art", icon: "Image", desc: "Vases, wall hangings & paintings" },
  { name: "Lighting & Lamps", icon: "Sun", desc: "LED bulbs, chandeliers & desk lamps" },
  { name: "Bath & Sanitary Accessories", icon: "Droplet", desc: "Towels, bath mats & organizers" },
  { name: "Storage & Organizers", icon: "Box", desc: "Racks, shoe boxes & storage containers" },
  { name: "Gardening & Plant Care", icon: "Flower2", desc: "Live plants, pots & gardening tools" },

  // Beauty & Personal Care (31-40)
  { name: "Skincare & Serums", icon: "Heart", desc: "Moisturizers, sunscreens & face washes" },
  { name: "Hair Care & Styling", icon: "Scissors", desc: "Shampoos, oils, conditioners & dryers" },
  { name: "Makeup & Cosmetics", icon: "Palette", desc: "Lipsticks, foundations & eye palettes" },
  { name: "Fragrances & Perfumes", icon: "Sparkle", desc: "Attar, body sprays & luxury perfumes" },
  { name: "Men's Grooming", icon: "User", desc: "Beard oils, trimmers & shaving creams" },
  { name: "Personal Hygiene & Care", icon: "Shield", desc: "Hand washes, soaps & sanitizers" },
  { name: "Baby Skincare & Bath", icon: "Smile", desc: "Baby lotion, shampoos & wet wipes" },
  { name: "Bath & Body Washes", icon: "Droplets", desc: "Shower gels, scrubs & body lotions" },
  { name: "Oral Care & Dental", icon: "Smile", desc: "Toothbrushes, mouthwashes & paste" },
  { name: "Health & Supplements", icon: "Activity", desc: "Vitamins, protein powders & wellness" },

  // Sports & Outdoors (41-50)
  { name: "Fitness & Gym Equipment", icon: "Dumbbell", desc: "Dumbbells, resistance bands & mats" },
  { name: "Cricket Equipment", icon: "Trophy", desc: "Bats, balls, pads & helmets" },
  { name: "Football & Team Sports", icon: "Trophy", desc: "Footballs, boots, jerseys & gloves" },
  { name: "Cycling & Bicycles", icon: "Bike", desc: "Bicycles, helmets, lights & locks" },
  { name: "Running & Athletics", icon: "Activity", desc: "Running shoes, shorts & armbands" },
  { name: "Racket Sports", icon: "Flame", desc: "Badminton, tennis rackets & shuttlecocks" },
  { name: "Camping & Outdoor Gear", icon: "Compass", desc: "Tents, sleeping bags & flashlights" },
  { name: "Water Sports & Swimming", icon: "Waves", desc: "Swimwear, goggles & life jackets" },
  { name: "Combat Sports & Boxing", icon: "ShieldAlert", desc: "Boxing gloves, punch bags & wraps" },
  { name: "Sports Accessories", icon: "Package", desc: "Water bottles, sports bags & towels" },

  // Books & Stationery (51-60)
  { name: "Bengali Literature", icon: "BookOpen", desc: "Novels, poetry, drama & classics" },
  { name: "English Fiction & Novels", icon: "Book", desc: "Bestsellers, thrillers & romance" },
  { name: "Academic & Textbooks", icon: "GraduationCap", desc: "School, college & university books" },
  { name: "Self-Help & Business", icon: "TrendingUp", desc: "Personal growth & finance books" },
  { name: "Children's Books", icon: "Smile", desc: "Fairy tales, comics & story books" },
  { name: "Office Supplies", icon: "Paperclip", desc: "Paper, staplers, files & folders" },
  { name: "Writing Instruments", icon: "PenTool", desc: "Pens, markers, pencils & highlighters" },
  { name: "Notebooks & Journals", icon: "FileText", desc: "Diaries, spiral notebooks & pads" },
  { name: "Art & Craft Supplies", icon: "Paintbrush", desc: "Canvas, paints, brushes & sketchbooks" },
  { name: "Calculators & Desk Tech", icon: "Calculator", desc: "Scientific calculators & desk pads" },

  // Toys & Kids (61-70)
  { name: "Action Figures & Statues", icon: "ToyBrick", desc: "Superheroes, anime & movie figures" },
  { name: "Board Games & Puzzles", icon: "Puzzle", desc: "Ludo, chess, Monopoly & jigsaw puzzles" },
  { name: "Educational & STEM Toys", icon: "Cpu", desc: "Robotics kits, science toys & blocks" },
  { name: "Baby & Toddler Toys", icon: "Heart", desc: "Rattles, teether toys & play mats" },
  { name: "Dolls & Dollhouses", icon: "Sparkles", desc: "Barbie, fashion dolls & playsets" },
  { name: "RC Cars & Vehicles", icon: "Truck", desc: "Remote control cars, drones & trains" },
  { name: "Building Blocks & LEGO", icon: "Box", desc: "Construction bricks & creative blocks" },
  { name: "Outdoor & Ride-on Toys", icon: "Bike", desc: "Tricycles, scooters & swing cars" },
  { name: "Pretend Play & Costumes", icon: "Smile", desc: "Doctor sets, kitchen sets & masks" },
  { name: "Plush & Stuffed Toys", icon: "Smile", desc: "Teddy bears, plush animals & cushions" },

  // Automotive & Motorbike (71-80)
  { name: "Motorbike Helmets & Gear", icon: "Shield", desc: "DOT helmets, riding jackets & gloves" },
  { name: "Car Electronics & Audio", icon: "Radio", desc: "Dash cams, Android players & speakers" },
  { name: "Auto Care & Cleaning", icon: "Sparkles", desc: "Car shampoo, microfibers & wax" },
  { name: "Car Accessories", icon: "Car", desc: "Seat covers, steering grips & floor mats" },
  { name: "Motorbike Parts & Accessories", icon: "Wrench", desc: "Exhausts, mirrors, chains & locks" },
  { name: "Car Lights & Bulbs", icon: "Sun", desc: "LED headlights, fog lights & strip lights" },
  { name: "Vehicle Oils & Lubricants", icon: "Droplet", desc: "Engine oils, brake fluid & coolants" },
  { name: "Tires & Rim Care", icon: "Disc", desc: "Tire inflators, sealants & pressure gauges" },
  { name: "GPS Trackers & Security", icon: "MapPin", desc: "Vehicle GPS, alarm systems & locks" },
  { name: "Auto Utility Tools", icon: "Hammer", desc: "Jumper cables, jack stands & tool kits" },

  // Groceries & Gourmet (81-90)
  { name: "Rice, Dal & Grains", icon: "ShoppingBag", desc: "Minikit, Nazirshail, lentils & flour" },
  { name: "Cooking Oils & Ghee", icon: "Droplet", desc: "Mustard oil, soybean oil & pure ghee" },
  { name: "Spices & Masala", icon: "Flame", desc: "Turmeric, chili powder, cumin & mix spices" },
  { name: "Tea, Coffee & Beverages", icon: "Coffee", desc: "Green tea, black tea & instant coffee" },
  { name: "Snacks, Biscuits & Chocolates", icon: "Cookie", desc: "Chanachur, cookies & chocolates" },
  { name: "Noodles, Pasta & Instant Food", icon: "Utensils", desc: "Ramen, macaroni & soup mixes" },
  { name: "Dairy & Breakfast Cereals", icon: "Milk", desc: "Powdered milk, oats, cornflakes & honey" },
  { name: "Baking Ingredients", icon: "Cake", desc: "Baking powder, cocoa, yeast & sugar" },
  { name: "Pickles, Sauces & Condiments", icon: "Flame", desc: "Mango pickle, tomato ketchup & mayo" },
  { name: "Imported & Specialty Foods", icon: "Globe", desc: "Olive oil, dates, nuts & dry fruits" },

  // Heritage, Artisan & Specialty (91-100)
  { name: "Nakshi Kantha & Handloom", icon: "Sparkles", desc: "Hand-stitched quilts & traditional art" },
  { name: "Jamdani & Muslin Products", icon: "Gem", desc: "Authentic Dhakai Jamdani sarees & stoles" },
  { name: "Terracotta & Clay Pottery", icon: "Flower", desc: "Clay vases, lamps & handmade cookware" },
  { name: "Jute Crafts & Bags", icon: "ShoppingBag", desc: "Jute tote bags, mats & home decor" },
  { name: "Brass & Metal Crafts", icon: "Shield", desc: "Antique brass showpieces & utensils" },
  { name: "Natural Honey & Sundarban Goods", icon: "Sun", desc: "Raw organic honey & natural wax" },
  { name: "Traditional Sweets & Pitha", icon: "Heart", desc: "Rosogolla, Sandesh & dry sweet boxes" },
  { name: "Leather Handicrafts", icon: "Briefcase", desc: "Handmade leather wallets & slippers" },
  { name: "Musical Instruments", icon: "Music", desc: "Harmonium, tabla, flutes & acoustic guitars" },
  { name: "Pet Supplies & Accessories", icon: "Heart", desc: "Cat food, dog treats, cages & toys" },
];

const BRAND_PREFIXES = ["Ultra", "Pro", "Elite", "Apex", "Prime", "Royal", "Nova", "Max", "Super", "Master", "Eco", "Smart"];
const ADJECTIVES = ["Premium", "Deluxe", "Ergonomic", "Handcrafted", "Compact", "High-Performance", "Authentic", "Stylish", "Durable", "Modern"];

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500",
  "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500",
  "https://images.unsplash.com/photo-1503602642458-232111445657?w=500",
];

async function generate99kDataset() {
  console.log("🚀 Starting generation & ingestion of 99,000 Products across 100 Categories...");
  const startTime = Date.now();
  const db = getDb();

  // Step 1: Ensure Sellers Exist in DB
  const existingSellers = await db.select().from(schema.sellers);
  let sellerIds = existingSellers.map((s: any) => s.id);

  if (sellerIds.length === 0) {
    console.log("Creating default seller for dataset...");
    const [userRes]: any = await db.insert(schema.users).values({
      name: "MarketVerse Official Seller",
      email: "official@marketverse.com",
      phone: "01700000000",
      passwordHash: "demo",
      role: "seller",
      unionId: "user_official_seller",
    });
    const [sellerRes]: any = await db.insert(schema.sellers).values({
      userId: userRes.insertId,
      businessName: "MarketVerse Official Store",
      businessEmail: "official@marketverse.com",
      businessPhone: "01700000000",
      description: "Official store for catalog items.",
      status: "approved",
    });
    sellerIds = [sellerRes.insertId];
  }

  // Step 2: Ensure 100 Categories in DB
  console.log("📦 Ingesting 100 Categories...");
  const categoryIds: number[] = [];

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    
    // Check if category exists
    const existing = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug)).limit(1);
    if (existing[0]) {
      categoryIds.push(existing[0].id);
    } else {
      const [res]: any = await db.insert(schema.categories).values({
        name: cat.name,
        slug,
        description: cat.desc,
        icon: cat.icon,
        imageUrl: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
      });
      categoryIds.push(res.insertId);
    }
  }

  console.log(`✅ ${categoryIds.length} Categories verified in Database.`);

  // Step 3: Batch Ingest 99,000 Products (990 products per category)
  const PRODUCTS_PER_CATEGORY = 990;
  const TOTAL_PRODUCTS = CATEGORIES.length * PRODUCTS_PER_CATEGORY; // 99,000
  const BATCH_SIZE = 1000;

  console.log(`⚡ Ingesting ${TOTAL_PRODUCTS.toLocaleString()} products in batches of ${BATCH_SIZE}...`);

  let insertedCount = 0;
  let batchProducts: any[] = [];
  const now = Date.now();

  for (let catIdx = 0; catIdx < CATEGORIES.length; catIdx++) {
    const catId = categoryIds[catIdx];
    const catObj = CATEGORIES[catIdx];

    for (let pIdx = 1; pIdx <= PRODUCTS_PER_CATEGORY; pIdx++) {
      insertedCount++;
      const prefix = BRAND_PREFIXES[(insertedCount * 7) % BRAND_PREFIXES.length];
      const adj = ADJECTIVES[(insertedCount * 13) % ADJECTIVES.length];
      const pName = `${prefix} ${adj} ${catObj.name} #${pIdx}`;
      const slug = `product-${catIdx + 1}-${pIdx}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const price = Math.floor(150 + ((insertedCount * 37) % 45000));
      const comparePrice = Math.floor(price * 1.25);
      const sellerId = sellerIds[insertedCount % sellerIds.length];
      const rating = (4 + (insertedCount % 10) / 10).toFixed(1);
      const reviewCount = Math.floor(5 + ((insertedCount * 19) % 350));
      const soldCount = Math.floor(10 + ((insertedCount * 43) % 2500));
      const stock = Math.floor(15 + ((insertedCount * 23) % 300));
      const img = SAMPLE_IMAGES[insertedCount % SAMPLE_IMAGES.length];

      batchProducts.push({
        name: pName,
        slug,
        description: `High quality ${catObj.name.toLowerCase()} featuring ${adj.toLowerCase()} build, high durability, and maximum utility for everyday use in Bangladesh.`,
        shortDescription: `${adj} ${catObj.name} with premium finish.`,
        price,
        comparePrice,
        deliveryFeeInsideDhaka: 60,
        deliveryFeeOutsideDhaka: 120,
        sku: `SKU-${catIdx + 1}-${pIdx}-${insertedCount}`,
        inventoryQuantity: stock,
        lowStockThreshold: 5,
        status: "active",
        sellerId,
        categoryId: catId,
        rating,
        reviewCount,
        soldCount,
        tags: `${catObj.name}, ${prefix}, ${adj}, e-commerce, bangladesh`,
        createdAt: now,
      });

      if (batchProducts.length >= BATCH_SIZE) {
        await db.insert(schema.products).values(batchProducts);
        console.log(`  ✓ Inserted ${insertedCount.toLocaleString()} / ${TOTAL_PRODUCTS.toLocaleString()} products...`);
        batchProducts = [];
      }
    }
  }

  // Insert remaining batch
  if (batchProducts.length > 0) {
    await db.insert(schema.products).values(batchProducts);
    console.log(`  ✓ Final batch inserted. Total: ${insertedCount.toLocaleString()} products.`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🎉 SUCCESS! 99,000 Products across 100 Categories successfully generated & saved to Database in ${durationSec}s!`);
}

generate99kDataset().catch((err) => {
  console.error("❌ Generation failed:", err);
  process.exit(1);
});
