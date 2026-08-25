import { describe, it, expect } from "vitest";
import { extractFashionFeatures, scoreProductForFeatures } from "./fashionStylistModel";

describe("fashion stylist local model", () => {
  it("extracts occasion, season, colors, and style from a natural request", () => {
    const features = extractFashionFeatures(
      "Suggest a polished outfit for a job interview in winter with navy and black"
    );

    expect(features.occasion).toBe("job interview");
    expect(features.season).toBe("winter");
    expect(features.colors).toEqual(expect.arrayContaining(["navy", "black"]));
    expect(features.style).toBe("classic");
  });

  it("scores products higher when they match the requested features", () => {
    const features = extractFashionFeatures("A business casual outfit for summer with navy and white");
    const scored = scoreProductForFeatures(
      {
        name: "Navy blazer",
        tags: "navy blazer business casual summer structured",
        price: 120,
        rating: 4.8,
        soldCount: 15,
      },
      features
    );

    expect(scored).toBeGreaterThan(40);
  });
});
