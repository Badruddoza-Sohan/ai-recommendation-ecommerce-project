import { describe, it, expect } from "vitest";
import { classifyVoiceIntent, classifySupportIntent, extractEntities, deriveLocalAction } from "./localNlp";

describe("local NLP intent classifier", () => {
  it("detects product search requests", () => {
    const result = classifyVoiceIntent("search for wireless headphones");

    expect(result.label).toBe("search");
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("detects cart actions", () => {
    const result = classifyVoiceIntent("add this item to my cart");

    expect(result.label).toBe("add_to_cart");
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("detects help and page questions", () => {
    const result = classifyVoiceIntent("what can you do on this page");

    expect(["help", "capabilities"]).toContain(result.label);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("detects support intents without external APIs", () => {
    const result = classifySupportIntent("where is my order number abc123");

    expect(result.label).toBe("order");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("extracts a product name from search phrases", () => {
    const entities = extractEntities("search for wireless headphones");

    expect(entities.productName).toBe("wireless headphones");
  });

  it("extracts an order id from support phrases", () => {
    const entities = extractEntities("where is my order number ORD-2024-0001");

    expect(entities.orderId).toBe("ORD-2024-0001");
  });

  it("derives a search action from a product phrase", () => {
    const action = deriveLocalAction("search for wireless headphones", "voice");

    expect(action.intent).toBe("search");
    expect(action.searchQuery).toBe("wireless headphones");
  });

  it("derives an order action from an order reference", () => {
    const action = deriveLocalAction("where is my order number ORD-2024-0001", "voice");

    expect(action.intent).toBe("order");
    expect(action.orderId).toBe("ORD-2024-0001");
  });

  it("derives an order action from an order reference", () => {
    const action = deriveLocalAction("where is my order number ORD-2024-0001", "support");

    expect(action.intent).toBe("order");
    expect(action.orderId).toBe("ORD-2024-0001");
  });
});
