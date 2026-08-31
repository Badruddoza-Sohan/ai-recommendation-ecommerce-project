export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getInventoryStatus(quantity: number | null | undefined, threshold: number | null | undefined) {
  const stock = Math.max(0, Number(quantity ?? 0));
  const safeThreshold = Math.max(0, Number(threshold ?? 5));

  if (stock <= 0) {
    return {
      status: "out_of_stock" as const,
      label: "Out of stock",
      tone: "red" as const,
    };
  }

  if (stock <= safeThreshold) {
    return {
      status: "low_stock" as const,
      label: "Low stock",
      tone: "amber" as const,
    };
  }

  return {
    status: "in_stock" as const,
    label: "In stock",
    tone: "green" as const,
  };
}
