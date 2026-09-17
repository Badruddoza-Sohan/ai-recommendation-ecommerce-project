export const SHIRT_PANT_MATCHING: Record<string, { pants: string[], use: string }> = {
  "White":           { pants: ["Black","Navy","Grey","Beige/Khaki"], use: "Formal, office, smart-casual" },
  "Light Blue":      { pants: ["Navy","Grey","Black","Beige/Khaki"], use: "Office, business-casual, smart-casual" },
  "Navy":            { pants: ["Grey","Beige/Khaki","White/Off-white"], use: "Office, smart-casual, evening" },
  "Black":           { pants: ["Grey/Charcoal","Beige","Cream/Off-white"], use: "Evening, smart-casual" },
  "Grey":            { pants: ["Black","Navy","Charcoal"], use: "Office, formal, smart-casual" },
  "Beige/Cream":     { pants: ["Navy","Brown","Olive","Dark Grey"], use: "Smart-casual, daytime" },
  "Olive":           { pants: ["Beige/Khaki","Cream","Black","Navy"], use: "Casual, smart-casual" },
  "Maroon/Burgundy": { pants: ["Black","Grey/Charcoal","Beige"], use: "Evening, smart-casual" },
};

export const SHOES_MATCHING_RULES: Record<string, { primary: string, alternative: string }> = {
  "Formal (Suit/Blazer)": { primary: "Oxford/Derby (Black or Brown)", alternative: "Monk Strap" },
  "Smart Casual (Chinos)": { primary: "Loafers", alternative: "Clean White Sneakers" },
  "Casual (Jeans)": { primary: "Sneakers", alternative: "Chelsea Boots" },
  "Traditional (Panjabi)": { primary: "Nagra/Mojari", alternative: "Leather Sandals" },
  "Athletic (Joggers)": { primary: "Running Shoes", alternative: "Training Sneakers" },
  "Summer/Beach (Shorts)": { primary: "Boat Shoes", alternative: "Espadrilles or Sandals" },
};

export const WATCH_MATCHING_RULES: Record<string, string[]> = {
  "Formal (Suit/Blazer)": ["Leather Strap Watch", "Minimalist Dress Watch"],
  "Smart Casual (Chinos)": ["Metal Bracelet Watch", "Chronograph"],
  "Casual (Jeans)": ["Field Watch", "Casual Chronograph", "Smartwatch"],
  "Traditional (Panjabi)": ["Classic Leather Watch", "Vintage Dress Watch"],
  "Athletic (Joggers)": ["Digital Sports Watch", "Fitness Tracker", "G-Shock"],
};

export const FORMALITY_SCALE = [
  "Casual (T-shirt, Jeans, Sneakers)",
  "Smart Casual (Polo/Casual Shirt, Chinos, Loafers/Clean Sneakers)",
  "Business Casual (Button-down, Dress Pants, Leather Shoes)",
  "Business Formal (Suit, Tie, Oxfords)",
  "Traditional (Panjabi, Pajama, Nagra)",
  "Luxury (Silk Panjabi/Sherwani, Embroidered Mojari)"
];

export const LAPTOP_USE_CASE_PROFILES: Record<string, { minimum: string, recommended: string }> = {
  "General/Study": { minimum: "8GB RAM, 256GB SSD, Core i3 / Ryzen 3", recommended: "16GB RAM, 512GB SSD, Core i5 / Ryzen 5" },
  "Programming":   { minimum: "8GB RAM, 256GB SSD, Core i5 / Ryzen 5", recommended: "16GB RAM, 512GB SSD, Core i5 / Ryzen 5 or higher (MacBook Air M1/M2/M3 is excellent)" },
  "Gaming (Entry)": { minimum: "16GB RAM, 512GB SSD, Core i5, GTX 1650 / RTX 3050", recommended: "16GB RAM, 1TB SSD, Core i5/i7, RTX 4050 / 4060" },
  "Gaming (High-End)": { minimum: "16GB RAM, 1TB SSD, Core i7, RTX 4070", recommended: "32GB RAM, 2TB SSD, Core i7/i9, RTX 4080 / 4090" },
  "Video Editing (1080p)": { minimum: "16GB RAM, 512GB SSD, Core i5, Dedicated GPU", recommended: "16GB/32GB RAM, 1TB SSD, Core i7, RTX 3060/4060 (MacBook Pro M-series)" },
  "Video Editing (4K)": { minimum: "32GB RAM, 1TB SSD, Core i7, RTX 4070", recommended: "64GB RAM, 2TB+ SSD, Core i9, RTX 4080 (MacBook Pro M Max)" },
  "Business/Travel": { minimum: "8GB RAM, 256GB SSD, Lightweight (< 1.5kg)", recommended: "16GB RAM, 512GB SSD, Great Battery, Lightweight (MacBook Air, ThinkPad X1)" }
};

export const PC_COMPATIBILITY_CHECKS = [
  { check: "CPU + Motherboard Socket", mustVerify: "Ensure the CPU socket matches the motherboard socket (e.g., LGA1700, AM5)." },
  { check: "Motherboard + CPU Chipset Support", mustVerify: "Ensure the motherboard chipset supports the CPU generation (may need BIOS update)." },
  { check: "Motherboard + RAM Type", mustVerify: "Check if the motherboard supports DDR4 or DDR5 (they are not cross-compatible)." },
  { check: "CPU Cooler Clearance", mustVerify: "Ensure the CPU cooler fits in the case and doesn't block RAM slots." },
  { check: "GPU Clearance", mustVerify: "Check the case's maximum GPU length and ensure the GPU fits." },
  { check: "Power Supply (PSU) Wattage", mustVerify: "Ensure PSU provides enough wattage for CPU + GPU + components with some headroom (e.g., 20%+)." },
  { check: "PSU Form Factor", mustVerify: "Ensure the PSU fits the case (ATX, SFX, etc.)." },
  { check: "Motherboard Form Factor + Case", mustVerify: "Ensure the case supports the motherboard size (ATX, Micro-ATX, Mini-ITX)." },
  { check: "Storage M.2 Slots", mustVerify: "Ensure the motherboard has enough NVMe M.2 slots for the SSDs." },
  { check: "Case Airflow & Fans", mustVerify: "Ensure the case has enough fan mounts and adequate airflow for high-end components." }
];

export const GAMING_GPU_TIERS = {
  "1080p Medium/High": ["GTX 1650", "RTX 3050", "RX 6600"],
  "1080p Ultra / 1440p Medium": ["RTX 3060", "RTX 4060", "RX 7600"],
  "1440p Ultra": ["RTX 4070", "RTX 4070 Super", "RX 7800 XT"],
  "4K High/Ultra": ["RTX 4080", "RTX 4090", "RX 7900 XTX"]
};

export const VIDEO_EDITING_SOFTWARE_REQS = {
  "Premiere Pro": "Prefers NVIDIA GPUs for CUDA acceleration, high single-core CPU performance, lots of RAM (32GB+ for 4K).",
  "DaVinci Resolve": "Heavily reliant on GPU VRAM and performance. Multiple GPUs scale well. Minimum 8GB VRAM for 4K.",
  "Final Cut Pro": "Only available on macOS. Highly optimized for Apple Silicon (M1/M2/M3).",
  "After Effects": "Needs massive amounts of RAM (64GB+ recommended) and strong CPU single-core performance."
};
