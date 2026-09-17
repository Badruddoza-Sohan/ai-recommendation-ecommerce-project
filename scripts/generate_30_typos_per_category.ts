import fs from "fs";
import path from "path";

// List of 100 Categories
const CATEGORIES = [
  "Mobiles & Smartphones", "Laptops & Computers", "Audio & Headphones", "Smartwatches & Wearables", "Gaming & Consoles",
  "Cameras & Photography", "TV & Home Entertainment", "Kitchen & Home Appliances", "Computer Accessories", "Smart Home & Automation",
  "Men's Casual Wear", "Women's Ethnic Wear", "Men's Traditional Wear", "Women's Western Wear", "Men's Footwear",
  "Women's Footwear", "Bags & Backpacks", "Jewelry & Ornaments", "Watches & Clocks", "Eyewear & Sunglasses",
  "Living Room Furniture", "Bedroom Furniture", "Bedding & Linens", "Kitchenware & Cookware", "Dining & Tableware",
  "Home Decor & Wall Art", "Lighting & Lamps", "Bath & Sanitary Accessories", "Storage & Organizers", "Gardening & Plant Care",
  "Skincare & Serums", "Hair Care & Styling", "Makeup & Cosmetics", "Fragrances & Perfumes", "Men's Grooming",
  "Personal Hygiene & Care", "Baby Skincare & Bath", "Bath & Body Washes", "Oral Care & Dental", "Health & Supplements",
  "Fitness & Gym Equipment", "Cricket Equipment", "Football & Team Sports", "Cycling & Bicycles", "Running & Athletics",
  "Racket Sports", "Camping & Outdoor Gear", "Water Sports & Swimming", "Combat Sports & Boxing", "Sports Accessories",
  "Bengali Literature", "English Fiction & Novels", "Academic & Textbooks", "Self-Help & Business", "Children's Books",
  "Office Supplies", "Writing Instruments", "Notebooks & Journals", "Art & Craft Supplies", "Calculators & Desk Tech",
  "Action Figures & Statues", "Board Games & Puzzles", "Educational & STEM Toys", "Baby & Toddler Toys", "Dolls & Dollhouses",
  "RC Cars & Vehicles", "Building Blocks & LEGO", "Outdoor & Ride-on Toys", "Pretend Play & Costumes", "Plush & Stuffed Toys",
  "Motorbike Helmets & Gear", "Car Electronics & Audio", "Auto Care & Cleaning", "Car Accessories", "Motorbike Parts & Accessories",
  "Car Lights & Bulbs", "Vehicle Oils & Lubricants", "Tires & Rim Care", "GPS Trackers & Security", "Auto Utility Tools",
  "Rice, Dal & Grains", "Cooking Oils & Ghee", "Spices & Masala", "Tea, Coffee & Beverages", "Snacks, Biscuits & Chocolates",
  "Noodles, Pasta & Instant Food", "Dairy & Breakfast Cereals", "Baking Ingredients", "Pickles, Sauces & Condiments", "Imported & Specialty Foods",
  "Nakshi Kantha & Handloom", "Jamdani & Muslin Products", "Terracotta & Clay Pottery", "Jute Crafts & Bags", "Brass & Metal Crafts",
  "Natural Honey & Sundarban Goods", "Traditional Sweets & Pitha", "Leather Handicrafts", "Musical Instruments", "Pet Supplies & Accessories"
];

// QWERTY keyboard adjacent map for realistic typo generation
const KEYBOARD_ADJACENT: Record<string, string[]> = {
  a: ["q", "w", "s", "z"], b: ["v", "g", "h", "n"], c: ["x", "d", "f", "v"], d: ["s", "e", "r", "f", "x", "c"],
  e: ["w", "s", "d", "r"], f: ["d", "r", "t", "g", "c", "v"], g: ["f", "t", "y", "h", "v", "b"], h: ["g", "y", "u", "j", "b", "n"],
  i: ["u", "j", "k", "o"], j: ["h", "u", "i", "k", "n", "m"], k: ["j", "i", "o", "l", "m"], l: ["k", "o", "p"],
  m: ["n", "j", "k"], n: ["b", "h", "j", "m"], o: ["i", "k", "l", "p"], p: ["o", "l"],
  q: ["w", "a"], r: ["e", "d", "f", "t"], s: ["a", "w", "e", "d", "x", "z"], t: ["r", "f", "g", "y"],
  u: ["y", "h", "j", "i"], v: ["c", "f", "g", "b"], w: ["q", "a", "s", "e"], x: ["z", "s", "d", "c"],
  y: ["t", "g", "h", "u"], z: ["a", "s", "x"]
};

// Generate 30+ unique realistic typos for a given category name
function generate30Typos(catName: string): string[] {
  const clean = catName.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  const typos = new Set<string>();

  // 1. Phonetic / Banglish variations
  if (clean.includes("headphone") || clean.includes("audio")) {
    ["hedfon", "headfon", "hedfone", "headphon", "hedphon", "audioo", "adio"].forEach(t => typos.add(t));
  }
  if (clean.includes("smartphone") || clean.includes("mobile")) {
    ["smartphon", "smrtphone", "mobail", "mobl", "mobaile", "smrtphon"].forEach(t => typos.add(t));
  }
  if (clean.includes("traditional") || clean.includes("ethnic")) {
    ["tradissonal", "tradiotional", "etnic", "ethnek", "ethnik"].forEach(t => typos.add(t));
  }
  if (clean.includes("saree") || clean.includes("wear")) {
    ["shari", "sari", "sharee", "waer", "wer", "ware"].forEach(t => typos.add(t));
  }

  // 2. Algorithmic typo mutations across words
  words.forEach(word => {
    if (word.length < 3) return;

    // Single character deletions (skipped letters)
    for (let i = 0; i < word.length; i++) {
      const del = word.slice(0, i) + word.slice(i + 1);
      if (del.length >= 3) typos.add(clean.replace(word, del));
    }

    // Adjacent QWERTY key swaps
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const adjList = KEYBOARD_ADJACENT[char] || [];
      adjList.slice(0, 3).forEach(adj => {
        const swapped = word.slice(0, i) + adj + word.slice(i + 1);
        typos.add(clean.replace(word, swapped));
      });
    }

    // Neighboring character transpositions (swapped letters)
    for (let i = 0; i < word.length - 1; i++) {
      const trans = word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
      typos.add(clean.replace(word, trans));
    }

    // Double letter insertions
    for (let i = 0; i < word.length; i++) {
      const dbl = word.slice(0, i) + word[i] + word[i] + word.slice(i + 1);
      typos.add(clean.replace(word, dbl));
    }
  });

  // Ensure at least 30 typos per category
  let extraIndex = 1;
  while (typos.size < 30) {
    const wordToMutate = words[extraIndex % words.length] || "category";
    const mutated = wordToMutate.slice(0, Math.max(2, wordToMutate.length - 1)) + (extraIndex % 2 === 0 ? "s" : "e");
    typos.add(clean.replace(wordToMutate, mutated) + (extraIndex % 3 === 0 ? "s" : ""));
    extraIndex++;
  }

  return Array.from(typos).slice(0, 35);
}

function main() {
  console.log("🚀 Generating at least 30 typo variations per category across 100 categories...");

  const typoMap: Record<string, string[]> = {};
  const dictionaryMap: Record<string, string> = {};
  let totalTypos = 0;

  CATEGORIES.forEach((cat) => {
    const list = generate30Typos(cat);
    typoMap[cat] = list;
    totalTypos += list.length;

    // Add each typo to dictionary pointing to canonical category
    list.forEach((t) => {
      dictionaryMap[t] = cat;
    });
  });

  console.log(`✅ Generated ${totalTypos.toLocaleString()} total typos across ${CATEGORIES.length} categories!`);
  console.log(`Average typos per category: ${(totalTypos / CATEGORIES.length).toFixed(1)}`);

  // Write categoryTypos.ts file
  const fileContent = `/**
 * Comprehensive 30+ Typo & Misspelling Dictionary for 100 E-Commerce Categories
 * Total Typo Mapping: ${totalTypos.toLocaleString()} items
 */

export const CATEGORY_TYPO_MAP: Record<string, string[]> = ${JSON.stringify(typoMap, null, 2)};

export const TYPO_TO_CANONICAL_CATEGORY: Record<string, string> = ${JSON.stringify(dictionaryMap, null, 2)};
`;

  const outputPath = path.resolve(process.cwd(), "src/lib/categoryTypos.ts");
  fs.writeFileSync(outputPath, fileContent, "utf8");
  console.log("💾 Saved category typo dictionary file to:", outputPath);
}

main();
