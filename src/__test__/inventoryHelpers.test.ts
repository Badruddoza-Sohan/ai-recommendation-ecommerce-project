import { describe, it, expect } from "vitest";
import { getInventoryStatus } from "../lib/inventory";

describe("getInventoryStatus", () => {
  it("returns out of stock for zero quantity", () => {
    expect(getInventoryStatus(0, 5)).toMatchObject({
      status: "out_of_stock",
      label: "Out of stock",
      tone: "red",
    });
  });

  it("returns low stock when quantity is at or below threshold", () => {
    expect(getInventoryStatus(3, 5)).toMatchObject({
      status: "low_stock",
      label: "Low stock",
      tone: "amber",
    });
  });

  it("returns in stock when quantity is above threshold", () => {
    expect(getInventoryStatus(12, 5)).toMatchObject({
      status: "in_stock",
      label: "In stock",
      tone: "green",
    });
  });
});
