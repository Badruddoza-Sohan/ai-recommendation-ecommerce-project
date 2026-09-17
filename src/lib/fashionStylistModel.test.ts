import { describe, it, expect } from "vitest";
import { extractFashionFeatures, scoreProductForFeatures } from "./fashionStylistModel";
import { BDT_PRICE_RANGES, getCatalogAttributeOptions, getColorMatch, resolveClevoraLocally } from "./clevoraLocalEngine";

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

  it("uses stored variant sizes for pants instead of generic clothing sizes", () => {
    const catalog = [
      { name: "Slim Beige Pants", categoryName: "Pant", attributes: JSON.stringify({ color: "Beige" }), variants: [{ size: "30" }, { size: "34" }] },
      { name: "Laptop", categoryName: "Laptop", attributes: JSON.stringify({ ram: "16GB", storageCapacity: "512GB" }) },
    ];

    expect(getCatalogAttributeOptions(catalog, "pant", "size", "beige")).toEqual(["30", "34"]);
    expect(getCatalogAttributeOptions(catalog, "gadget", "size")).toEqual([]);

    const result = resolveClevoraLocally("Beige", { itemType: "shirt", color: "navy", need: "pant", occasion: "general" }, catalog);
    expect(result?.quickActions).toEqual(["30", "34"]);
  });

  it("uses the reference table for shirt, polo, and pastel color matches", () => {
    expect(getColorMatch("Navy Blue").pants).toEqual(["White", "Khaki", "Gray", "Beige", "Light Blue"]);
    expect(getColorMatch("Burgundy").shoes).toEqual(["Brown", "Black"]);
    expect(getColorMatch("Pink").watches).toEqual(["Brown Leather Watch", "Tan Watch"]);
    expect(getColorMatch("Orange").pants).toEqual(["White", "Black", "Gray", "Navy", "Khaki"]);

    const poloResult = resolveClevoraLocally("Navy Blue polo", { itemType: "t-shirt", color: "navy blue" });
    expect(poloResult?.content).toContain("Recommended Pants");
    expect(poloResult?.content).toContain("White");
  });

  it("keeps the target category when matching in either direction", () => {
    const catalog = [
      { name: "Beige Tailored Pants", categoryName: "Pant", quantity: 4, attributes: JSON.stringify({ color: "Beige" }) },
      { name: "White Tailored Pants", categoryName: "Pant", quantity: 4, attributes: JSON.stringify({ color: "White" }) },
      { name: "Navy Blue Shirt", categoryName: "Shirt", quantity: 4, attributes: JSON.stringify({ color: "Navy Blue" }) },
      { name: "White Shirt", categoryName: "Shirt", quantity: 4, attributes: JSON.stringify({ color: "White" }) },
    ];

    const pantToShirtStart = resolveClevoraLocally("I have pant, find shirt", {}, catalog);
    expect(pantToShirtStart?.context).toMatchObject({ sourceItemType: "pant", targetCategory: "shirt" });
    const pantColorStep = resolveClevoraLocally("Beige", pantToShirtStart?.context, catalog);
    expect(pantColorStep?.category).toBeUndefined();
    expect(pantColorStep?.search).toBeUndefined();
    const pantToShirt = resolveClevoraLocally("Navy Blue", pantColorStep?.context, catalog);
    expect(pantToShirt?.category).toBe("shirt");
    expect(pantToShirt?.search).toBe("shirt");
    expect(pantToShirt?.searchColors).toEqual(expect.arrayContaining(["Navy Blue"]));

    const shirtToPantStart = resolveClevoraLocally("I have shirt, find pant", {}, catalog);
    expect(shirtToPantStart?.context).toMatchObject({ sourceItemType: "shirt", targetCategory: "pant" });
    const shirtColorStep = resolveClevoraLocally("Navy Blue", shirtToPantStart?.context, catalog);
    expect(shirtColorStep?.category).toBeUndefined();
    expect(shirtColorStep?.search).toBeUndefined();
    const shirtToPant = resolveClevoraLocally("White", shirtColorStep?.context, catalog);
    expect(shirtToPant?.category).toBe("pant");
    expect(shirtToPant?.search).toBe("pant");
    expect(shirtToPant?.searchColors).toEqual(["White"]);
  });

  it("advances from selected color to size without re-offering colors", () => {
    const catalog = [
      { name: "White Pants", categoryName: "Pant", attributes: JSON.stringify({ color: "White" }), variants: [{ size: "30", quantity: 2 }, { size: "32", quantity: 3 }] },
    ];
    const start = resolveClevoraLocally("I have a black shirt, find matching pants", {}, catalog);
    const selected = resolveClevoraLocally("White", start?.context, catalog);

    expect(selected?.context?.targetColor).toBe("White");
    expect(selected?.quickActions).toEqual(["30", "32"]);
    expect(selected?.quickActions).not.toContain("Choose another color");

    const sized = resolveClevoraLocally("32", selected?.context, catalog);
    expect(sized?.context?.size).toBe("32");
    expect(sized?.searchColors).toEqual(["White"]);
  });

  it("does not confirm an unavailable color and offers only stocked alternatives", () => {
    const catalog = [
      { name: "Gray Pants", categoryName: "Pant", quantity: 3, attributes: JSON.stringify({ color: "Gray" }) },
    ];
    const start = resolveClevoraLocally("I have a white shirt, find matching pants", {}, catalog);
    const unavailable = resolveClevoraLocally("Black", start?.context, catalog);

    expect(unavailable?.category).toBeUndefined();
    expect(unavailable?.search).toBeUndefined();
    expect(unavailable?.content).toContain("out of stock");
    expect(unavailable?.quickActions).toContain("Gray");
  });

  it("uses numeric BDT ranges for laptop inventory searches", () => {
    expect(BDT_PRICE_RANGES.map((range) => range.label)).toEqual([
      "0 - 30,000 BDT",
      "30,000 - 60,000 BDT",
      "60,000 - 90,000 BDT",
      "90,000+ BDT",
    ]);
    const useCase = resolveClevoraLocally("Programming", { gadgetType: "laptop" });
    const budget = resolveClevoraLocally("30,000 - 60,000 BDT", useCase?.context);
    expect(budget?.category).toBe("laptop");
    expect(budget?.search).toBe("laptop");
    expect(budget?.context).toMatchObject({ priceMin: 30000, priceMax: 60000 });
  });

  it("uses the shared BDT budget flow for every electronics subcategory", () => {
    const categories = [
      ["smartphone", "smartphone"],
      ["earbuds", "earbuds"],
      ["smartwatch", "smartwatch"],
      ["camera", "camera"],
      ["speaker", "speaker"],
      ["monitor", "monitor"],
      ["tablet", "tablet"],
    ] as const;

    for (const [prompt, category] of categories) {
      const budgetPrompt = resolveClevoraLocally(`I want a ${prompt}`, {});
      const result = resolveClevoraLocally("0 - 30,000 BDT", budgetPrompt?.context);
      expect(result?.category).toBe(category);
      expect(result?.context).toMatchObject({ priceMin: 0, priceMax: 30000 });
    }
  });

  it("maps Shopping actions to database-backed product query modes", () => {
    expect(resolveClevoraLocally("Trending Products")?.productQuery).toEqual({ sort: "trending" });
    expect(resolveClevoraLocally("Best Deals")?.productQuery).toEqual({ sort: "deals" });
    expect(resolveClevoraLocally("New Arrivals")?.productQuery).toEqual({ sort: "newest" });
    expect(resolveClevoraLocally("Top Rated Products")?.productQuery).toEqual({ sort: "topRated", minReviewCount: 10 });
  });

  it("leaves genuinely open-ended prompts for the model fallback", () => {
    expect(resolveClevoraLocally("Help me plan a versatile wardrobe for a month", {})).toBeNull();
    expect(resolveClevoraLocally("Best Deals", {} )?.productQuery).toEqual({ sort: "deals" });
  });
});
