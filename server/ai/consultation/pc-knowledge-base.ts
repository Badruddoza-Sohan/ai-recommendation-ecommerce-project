export const LAPTOP_USE_CASES = [
  { useCase: "General/Study", examples: "Browsing, Office, PDF, classes, video calls" },
  { useCase: "Programming", examples: "IDE, browser, database, Docker/VM if needed" },
  { useCase: "Graphic Design", examples: "Photoshop/Illustrator/UI design, color/display needs" },
  { useCase: "Video Editing", examples: "HD vs 4K, codec/workflow, CPU/GPU/RAM/storage needs" },
  { useCase: "Gaming", examples: "Games, resolution, FPS target, graphics settings" },
  { useCase: "Data Science/AI", examples: "Python, datasets, notebooks, local ML vs cloud" },
  { useCase: "Office/Business", examples: "Office apps, multitasking, portability, reliability" },
  { useCase: "Full PC Build", examples: "Workload, budget, resolution, component compatibility" }
];

export const PRACTICAL_BASELINES = {
  "General / Study": {
    minimum: "8 GB RAM, SSD, modern entry-level CPU",
    recommended: "16 GB RAM, 512 GB SSD, modern Core i5/Ryzen 5-class or equivalent"
  },
  "Programming": {
    minimum: "8 GB RAM, 256 GB SSD, modern entry-level CPU",
    recommended: "16 GB RAM, 512 GB SSD, Core i5/Ryzen 5-class or better"
  },
  "Graphic Design": {
    minimum: "8 GB RAM, SSD, capable integrated/discrete graphics depending on app",
    recommended: "16 GB RAM, 512 GB SSD, good display; discrete GPU when workload requires"
  },
  "HD Video Editing": {
    minimum: "8 GB RAM, supported GPU, SSD",
    recommended: "16 GB RAM, fast SSD, capable GPU"
  },
  "4K Video Editing": {
    minimum: "16 GB RAM, capable GPU, fast SSD",
    recommended: "32 GB+ RAM, 8 GB-class GPU memory target where supported, fast SSD + additional media storage"
  },
  "Gaming": {
    minimum: "Depends on specific game; 16 GB RAM is a practical baseline",
    recommended: "16–32 GB RAM, dedicated GPU selected from the target game's requirements and target resolution/FPS"
  }
};

export const PC_COMPATIBILITY_RULES = [
  "CPU + Motherboard: Verify Socket/platform compatibility",
  "Motherboard + RAM: Verify Supported RAM generation/type/capacity",
  "CPU + Cooler: Verify Socket support and thermal capacity",
  "GPU + Motherboard: Verify Compatible expansion slot/interface",
  "GPU + PSU: Verify Adequate power capacity and required connectors",
  "GPU + Case: Verify GPU length/height/slot clearance",
  "Cooler + Case: Verify Cooler height/radiator clearance",
  "Motherboard + Case: Verify Form factor support",
  "Storage + Motherboard: Verify M.2/SATA interface and slot availability",
  "PSU + System: Verify Adequate headroom and connector availability"
];
