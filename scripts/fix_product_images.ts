import { getDb } from "../api/queries/connection";
import { products, productImages } from "../db/schema";
import { eq } from "../db/mysql";

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // Electronics (categoryId 1)
  "wireless-bluetooth-headphones-pro": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
  "smart-watch-ultra-series": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
  "ultra-slim-laptop-stand": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
  "portable-charger-20000mah": "https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=800&q=80",
  "4k-webcam-ring-light": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80",
  "mechanical-gaming-keyboard-rgb": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80",
  "wireless-mouse-ergonomic": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80",
  "usb-c-hub-7-in-1": "https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800&q=80",
  "bluetooth-speaker-waterproof": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80",
  "tablet-stand-adjustable": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80",
  "noise-cancelling-earbuds": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
  "smart-home-security-camera": "https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=800&q=80",

  // Fashion (categoryId 2)
  "classic-fit-cotton-t-shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80",
  "slim-fit-chino-pants": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80",
  "running-shoes-performance": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
  "leather-crossbody-bag": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
  "denim-jacket-vintage-wash": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80",
  "silk-scarf-floral-print": "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80",
  "athletic-joggers": "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&q=80",
  "polarized-sunglasses": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80",
  "wool-blend-overcoat": "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80",
  "canvas-sneakers-low-top": "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80",
  "leather-belt-reversible": "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80",
  "casual-linen-shirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80",

  // Home & Living (categoryId 3)
  "ceramic-table-lamp-set": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
  "memory-foam-pillow": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80",
  "indoor-plant-pot-set": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80",
  "weighted-blanket-15lb": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  "bamboo-cutting-board-set": "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&q=80",
  "scented-candle-gift-set": "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&q=80",
  "wall-art-canvas-print": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80",
  "kitchen-organizer-rack": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80",
  "throw-pillow-covers-set": "https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=800&q=80",
  "glass-food-storage-set": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800&q=80",
  "led-strip-lights-16ft": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80",
  "bath-towel-set-6-piece": "https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=800&q=80",

  // Sports & Outdoors (categoryId 4)
  "yoga-mat-non-slip": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80",
  "resistance-bands-set": "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&q=80",
  "camping-tent-4-person": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
  "stainless-steel-water-bottle": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
  "foam-roller-massage": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
  "hiking-backpack-40l": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
  "dumbbell-set-adjustable": "https://images.unsplash.com/photo-1638558642968-578140386a24?w=800&q=80",
  "cycling-helmet-mips": "https://images.unsplash.com/photo-1559348349-86f1f65817fe?w=800&q=80",
  "jump-rope-speed": "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80",
  "sleeping-bag-3-season": "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=800&q=80",
  "fitness-tracker-watch": "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80",
  "portable-hammock-double": "https://images.unsplash.com/photo-1445307806294-bff7f67ff225?w=800&q=80",

  // Books & Media (categoryId 5)
  "art-of-design-hardcover": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80",
  "science-fiction-collection": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
  "cookbook-world-flavors": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80",
  "mindfulness-journal": "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80",
  "programming-mastery-guide": "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80",
  "children-picture-book-set": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80",
  "vinyl-record-player": "https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=800&q=80",
  "biography-innovators": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80",
  "art-supplies-premium-set": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
  "mystery-novel-collection": "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
  "guitar-beginners-book": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80",
  "self-help-growth-mindset": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80",

  // Health & Beauty (categoryId 6)
  "vitamin-c-serum-30ml": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
  "natural-shampoo-bar": "https://images.unsplash.com/photo-1607006482142-e08ef7d7807d?w=800&q=80",
  "facial-cleansing-brush": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
  "organic-lip-balm-set": "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&q=80",
  "essential-oil-diffuser": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
  "retinol-night-cream": "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80",
  "bath-bomb-gift-set": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
  "hair-mask-treatment": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&q=80",
  "electric-toothbrush": "https://images.unsplash.com/photo-1559671982-8ab9d458c6e3?w=800&q=80",
  "body-scrub-coconut": "https://images.unsplash.com/photo-1567928269937-ae146e45b428?w=800&q=80",
  "jade-roller-gua-sha-set": "https://images.unsplash.com/photo-1617897903246-719242758050?w=800&q=80",
  "sunscreen-spf-50": "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80",

  // Toys & Kids (categoryId 7)
  "wooden-building-blocks": "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80",
  "plush-teddy-bear-large": "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&q=80",
  "stem-science-kit": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80",
  "remote-control-car": "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=800&q=80",
  "puzzle-1000-pieces": "https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=800&q=80",
  "musical-keyboard-kids": "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80",
  "art-easel-kids": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
  "baby-activity-gym": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80",
  "board-game-strategy": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&q=80",
  "drone-mini-kids": "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&q=80",

  // Food & Beverages (categoryId 8)
  "gourmet-coffee-beans": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80",
  "organic-green-tea-set": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80",
  "raw-honey-jar": "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80",
  "artisan-chocolates": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&q=80",
  "extra-virgin-olive-oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80",

  // Automotive (categoryId 9)
  "car-dash-cam-4k": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
  "portable-tire-inflator": "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80",
  "car-leather-cleaning-kit": "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800&q=80",
  "universal-phone-mount": "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&q=80",

  // Jewelry & Watches (categoryId 10)
  "minimalist-watch-silver": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80",
  "gold-chain-necklace": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
  "stud-earrings-crystal": "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=800&q=80",
  "leather-bracelet-men": "https://images.unsplash.com/photo-1611591475777-233cd732b3a0?w=800&q=80",
  "smart-watch-band-set": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80",
  "pearl-drop-earrings": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
};

// Fallback gallery sets per category if slug is not matched
export const CATEGORY_GALLERY_IMAGES: Record<number, string[]> = {
  1: [ // Electronics
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"
  ],
  2: [ // Fashion
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80",
    "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80"
  ],
  3: [ // Home
    "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
    "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80",
    "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"
  ],
  4: [ // Sports
    "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80",
    "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"
  ],
  5: [ // Books
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&q=80",
    "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80"
  ],
  6: [ // Health & Beauty
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
    "https://images.unsplash.com/photo-1607006482142-e08ef7d7807d?w=800&q=80",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
    "https://images.unsplash.com/photo-1617897903246-719242758050?w=800&q=80"
  ],
  7: [ // Toys
    "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80",
    "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&q=80",
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80",
    "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=800&q=80"
  ],
  8: [ // Food
    "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80",
    "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80",
    "https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80",
    "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&q=80"
  ],
  9: [ // Auto
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80",
    "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800&q=80",
    "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&q=80"
  ],
  10: [ // Jewelry & Watches
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
    "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=800&q=80",
    "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80",
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80"
  ]
};

export async function fixAllProductImages() {
  const db = getDb();
  const allProds = await db.select().from(products);
  console.log(`Starting multi-image gallery fix for ${allProds.length} products...`);

  let updatedCount = 0;

  for (const prod of allProds) {
    const primaryUrl =
      PRODUCT_IMAGE_MAP[prod.slug] ||
      (CATEGORY_GALLERY_IMAGES[prod.categoryId] ? CATEGORY_GALLERY_IMAGES[prod.categoryId][0] : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80");

    const categoryGallery = CATEGORY_GALLERY_IMAGES[prod.categoryId] || [primaryUrl];

    const productGallery = [
      primaryUrl,
      categoryGallery[1] || primaryUrl,
      categoryGallery[2] || primaryUrl,
      categoryGallery[3] || primaryUrl,
    ].slice(0, 4);

    // Delete existing images for this product
    await db.delete(productImages).where(eq(productImages.productId, prod.id));

    // Insert 3-4 real Unsplash images
    for (let i = 0; i < productGallery.length; i++) {
      await db.insert(productImages).values({
        productId: prod.id,
        imageUrl: productGallery[i],
        altText: `${prod.name} photo ${i + 1}`,
        isPrimary: i === 0 ? 1 : 0,
        sortOrder: i,
      });
    }

    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} products with 3-4 real Unsplash gallery photos!`);
}

async function main() {
  await fixAllProductImages();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to fix images:", err);
  process.exit(1);
});
