import { describe, it, expect } from "vitest";
import { classifyFashionIntent } from "./fashionNlp";

describe("fashionNlp", () => {
  it("should detect greeting", () => {
    const result = classifyFashionIntent("hello there");
    expect(result.intent).toBe("greeting");
  });

  it("should detect thanks", () => {
    const result = classifyFashionIntent("thank you so much");
    expect(result.intent).toBe("thanks");
  });

  it("should detect outfit recommendation for a wedding", () => {
    const result = classifyFashionIntent("what should i wear to a wedding?");
    expect(result.intent).toBe("outfit");
    expect(result.occasion).toBe("wedding");
  });

  it("should detect outfit recommendation with typo (weeding)", () => {
    const result = classifyFashionIntent("i have a weeding tomorrow, suggest an outfit");
    expect(result.intent).toBe("outfit");
    expect(result.occasion).toBe("wedding");
  });

  it("should detect banglish wedding outfit (biyete ki porbo)", () => {
    const result = classifyFashionIntent("kal amr biyete ki porbo?");
    expect(result.intent).toBe("outfit");
    expect(result.occasion).toBe("wedding");
  });

  it("should detect color matching", () => {
    const result = classifyFashionIntent("what goes with navy blue?");
    expect(result.intent).toBe("color");
    expect(result.colors).toContain("navy");
    expect(result.colors).toContain("blue");
  });

  it("should detect seasonal trends", () => {
    const result = classifyFashionIntent("what is trending this summer?");
    expect(result.intent).toBe("seasonal");
    expect(result.season).toBe("summer");
  });
});
