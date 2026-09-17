import { describe, it, expect } from "vitest";
import { extractSearchTerms, scoreProductForSearch } from "./semanticSearch";

describe("semantic search ranking", () => {
  it("boosts products that match elegant dinner intent", () => {
    const product = {
      name: "Silk evening dress",
      tags: "elegant dinner party formal black",
      description: "A polished evening look for formal occasions",
      shortDescription: "Perfect for dinner",
    };

    const score = scoreProductForSearch(product, "something elegant for dinner");

    expect(score).toBeGreaterThan(28);
  });

  it("handles casual and outdoor intent without overmatching", () => {
    const product = {
      name: "Cotton t-shirt",
      tags: "casual comfort everyday",
      description: "A simple everyday top",
      shortDescription: "Comfortable for weekends",
    };

    const score = scoreProductForSearch(product, "something casual for outdoors");

    expect(score).toBeGreaterThan(18);
  });

  it("removes spoken intent words while retaining the product term", () => {
    expect(extractSearchTerms("I want to buy shoes")).toEqual(["shoes"]);
  });

  it("scores a product for a natural spoken shopping phrase", () => {
    const score = scoreProductForSearch({ name: "Running shoes" }, "I want to buy shoes");

    expect(score).toBeGreaterThan(0);
  });
});
