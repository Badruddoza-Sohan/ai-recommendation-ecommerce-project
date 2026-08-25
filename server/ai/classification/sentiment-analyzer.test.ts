import { describe, it, expect } from "vitest";
import { SentimentAnalyzer } from "./sentiment-analyzer.ts";

describe("SentimentAnalyzer", () => {
  const analyzer = new SentimentAnalyzer();

  it("should classify positive text accurately using fallback analyze", async () => {
    const result = await analyzer.analyze("I love this product, it is amazing!", true);
    expect(result.sentiment).toBe("positive");
    expect(result.score).toBeGreaterThan(0);
  });

  it("should classify negative text accurately using fallback analyze", async () => {
    const result = await analyzer.analyze("This item arrived broken and terrible quality!", true);
    expect(result.sentiment).toBe("negative");
    expect(result.score).toBeLessThan(0);
  });

  it("should flag escalation for high frustration or human agent request", async () => {
    const result = await analyzer.analyze("This is awful and broken, I hate it and want to speak to a real person!", true);
    expect(result.sentiment).toBe("negative");
    expect(result.shouldEscalate).toBe(true);
  });

  it("should classify neutral text accurately using fallback analyze", async () => {
    const result = await analyzer.analyze("What are your business hours?", true);
    expect(result.sentiment).toBe("neutral");
    expect(result.score).toBe(0);
  });
});
