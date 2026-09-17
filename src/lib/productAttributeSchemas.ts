export type ProductAttributeField = {
  key: string;
  label: string;
  type?: "text" | "select";
  options?: string[];
};

export type ProductAttributeSchema = {
  mainCategory: string;
  subcategories: Record<string, ProductAttributeField[]>;
};

const fashionFields = {
  size: { key: "size", label: "Size" },
  color: { key: "color", label: "Color" },
  fabric: { key: "fabric", label: "Fabric" },
  material: { key: "material", label: "Material" },
  fit: { key: "fit", label: "Fit" },
  sleeveType: { key: "sleeveType", label: "Sleeve Type" },
  collarType: { key: "collarType", label: "Collar Type" },
  length: { key: "length", label: "Length" },
  season: { key: "season", label: "Season" },
  closureType: { key: "closureType", label: "Closure Type" },
  soleType: { key: "soleType", label: "Sole Type" },
  dimensions: { key: "dimensions", label: "Dimensions" },
  capacity: { key: "capacity", label: "Capacity" },
};

const electronicsFields = {
  processor: { key: "processor", label: "Processor Brand / Model" },
  ram: { key: "ram", label: "RAM" },
  ramType: { key: "ramType", label: "RAM Type" },
  storageType: { key: "storageType", label: "Storage Type" },
  storageCapacity: { key: "storageCapacity", label: "Storage Capacity" },
  display: { key: "display", label: "Display Size / Resolution" },
  graphics: { key: "graphics", label: "Graphics" },
  os: { key: "os", label: "Operating System" },
  battery: { key: "battery", label: "Battery" },
  weight: { key: "weight", label: "Weight" },
  ports: { key: "ports", label: "Ports" },
  storage: { key: "storage", label: "Storage" },
  graphicsCard: { key: "graphicsCard", label: "Graphics Card" },
  motherboard: { key: "motherboard", label: "Motherboard" },
  psuWattage: { key: "psuWattage", label: "PSU Wattage" },
  caseType: { key: "caseType", label: "Case Type" },
  screenSize: { key: "screenSize", label: "Screen Size" },
  resolution: { key: "resolution", label: "Resolution" },
  panelType: { key: "panelType", label: "Panel Type" },
  refreshRate: { key: "refreshRate", label: "Refresh Rate" },
  connectivity: { key: "connectivity", label: "Connectivity" },
  dpi: { key: "dpi", label: "DPI" },
  buttons: { key: "buttons", label: "Buttons" },
  ergonomicType: { key: "ergonomicType", label: "Ergonomic Type" },
  switchType: { key: "switchType", label: "Switch Type" },
  layout: { key: "layout", label: "Layout" },
  backlight: { key: "backlight", label: "Backlight" },
  capacity: { key: "capacity", label: "Capacity" },
  type: { key: "type", label: "Type" },
  speed: { key: "speed", label: "Speed" },
  formFactor: { key: "formFactor", label: "Form Factor" },
  brand: { key: "brand", label: "Brand" },
  model: { key: "model", label: "Model" },
  vram: { key: "vram", label: "VRAM" },
  socketType: { key: "socketType", label: "Socket Type" },
  chipset: { key: "chipset", label: "Chipset" },
  efficiencyRating: { key: "efficiencyRating", label: "Efficiency Rating" },
  modularType: { key: "modularType", label: "Modular Type" },
  compatibility: { key: "compatibility", label: "Compatibility" },
};

export const PRODUCT_ATTRIBUTE_SCHEMAS: ProductAttributeSchema[] = [
  {
    mainCategory: "Fashion",
    subcategories: {
      Shirt: [fashionFields.size, fashionFields.color, fashionFields.fabric, fashionFields.sleeveType, fashionFields.collarType, fashionFields.fit],
      "T-Shirt": [fashionFields.size, fashionFields.color, fashionFields.fabric, fashionFields.sleeveType, fashionFields.collarType, fashionFields.fit],
      Pant: [fashionFields.size, fashionFields.color, fashionFields.fabric, fashionFields.fit, fashionFields.length],
      Jeans: [fashionFields.size, fashionFields.color, fashionFields.fabric, fashionFields.fit, fashionFields.length],
      Jacket: [fashionFields.size, fashionFields.color, fashionFields.material, fashionFields.season, fashionFields.closureType],
      Shoes: [fashionFields.size, fashionFields.color, fashionFields.material, fashionFields.soleType, fashionFields.closureType],
      Bag: [fashionFields.material, fashionFields.color, fashionFields.dimensions, fashionFields.capacity],
    },
  },
  {
    mainCategory: "Electronics",
    subcategories: {
      Laptop: [electronicsFields.processor, electronicsFields.ram, electronicsFields.ramType, electronicsFields.storageType, electronicsFields.storageCapacity, electronicsFields.display, electronicsFields.graphics, electronicsFields.os, electronicsFields.battery, electronicsFields.weight, electronicsFields.ports],
      "Desktop PC": [electronicsFields.processor, electronicsFields.ram, electronicsFields.storage, electronicsFields.graphicsCard, electronicsFields.motherboard, electronicsFields.psuWattage, electronicsFields.caseType],
      Monitor: [electronicsFields.screenSize, electronicsFields.resolution, electronicsFields.panelType, electronicsFields.refreshRate, electronicsFields.ports],
      Mouse: [electronicsFields.connectivity, electronicsFields.dpi, electronicsFields.buttons, electronicsFields.ergonomicType],
      Keyboard: [electronicsFields.connectivity, electronicsFields.switchType, electronicsFields.layout, electronicsFields.backlight],
      RAM: [electronicsFields.capacity, electronicsFields.type, electronicsFields.speed, electronicsFields.formFactor],
      "SSD/HDD": [electronicsFields.capacity, electronicsFields.type, electronicsFields.speed, electronicsFields.formFactor],
      "Graphics Card": [electronicsFields.brand, electronicsFields.model, electronicsFields.vram, electronicsFields.ports],
      Motherboard: [electronicsFields.socketType, electronicsFields.chipset, electronicsFields.formFactor],
      "Power Supply": [electronicsFields.psuWattage, electronicsFields.efficiencyRating, electronicsFields.modularType],
      "Laptop Accessories": [electronicsFields.type, electronicsFields.compatibility, electronicsFields.ports, electronicsFields.weight],
    },
  },
];

export function getAttributeSchema(mainCategory: string, subcategory: string): ProductAttributeField[] {
  return PRODUCT_ATTRIBUTE_SCHEMAS.find((schema) => schema.mainCategory === mainCategory)?.subcategories[subcategory] || [];
}

export function getMainCategoryForName(name: string): string {
  return name;
}
