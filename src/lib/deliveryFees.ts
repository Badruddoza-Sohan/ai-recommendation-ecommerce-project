export type DeliveryZone = "inside_dhaka" | "outside_dhaka";

export interface DeliveryFeeItem {
  quantity?: number | null;
  deliveryFeeInsideDhaka?: number | null;
  deliveryFeeOutsideDhaka?: number | null;
}

export function calculateDeliveryAmount(items: DeliveryFeeItem[], zone: DeliveryZone): number {
  return items.reduce((total, item) => {
    const fee = zone === "inside_dhaka"
      ? item.deliveryFeeInsideDhaka ?? 0
      : item.deliveryFeeOutsideDhaka ?? 0;

    return total + fee * (item.quantity ?? 1);
  }, 0);
}

export function determineDeliveryZone(location: string | null | undefined): DeliveryZone {
  const normalized = (location || "").toLowerCase();
  return normalized.includes("dhaka") ? "inside_dhaka" : "outside_dhaka";
}

export function getDeliveryZoneLabel(zone: DeliveryZone): string {
  return zone === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka";
}
