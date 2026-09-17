import { describe, it, expect } from "vitest";
import { determineDeliveryZone } from "./deliveryFees";

describe("determineDeliveryZone", () => {
  it("treats Dhaka addresses as inside Dhaka", () => {
    expect(determineDeliveryZone("Dhaka")).toBe("inside_dhaka");
    expect(determineDeliveryZone("Banani, Dhaka")).toBe("inside_dhaka");
  });

  it("treats other cities as outside Dhaka", () => {
    expect(determineDeliveryZone("Chittagong")).toBe("outside_dhaka");
    expect(determineDeliveryZone("Sylhet")).toBe("outside_dhaka");
  });
});
