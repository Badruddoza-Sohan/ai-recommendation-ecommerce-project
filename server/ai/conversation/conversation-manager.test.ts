import { describe, it, expect } from "vitest";
import { ConversationManager } from "./conversation-manager.ts";

describe("ConversationManager domain resolution", () => {
  const manager = new ConversationManager();

  it("uses fashion domain for outfit requests even when caller sends support", async () => {
    const resolved = await (manager as any).resolveDomain("I need a navy shirt for Eid dinner and matching shoes.", "support");
    expect(resolved).toBe("fashion");
  });

  it("uses gadgets domain for laptop and gaming requests", async () => {
    const resolved = await (manager as any).resolveDomain("I want a gaming laptop with RTX 4060 and 16GB RAM under 120k BDT.", "support");
    expect(resolved).toBe("gadgets");
  });

  it("keeps waist-size fit questions in the fashion domain even when the answer is 30", async () => {
    const resolved = await (manager as any).resolveDomain("I have a white shirt. Suggest matching pants in waist size 30.", "support");
    expect(resolved).toBe("fashion");
  });

  it("normalizes bare waist-size numbers into a fashion pant query", async () => {
    const normalized = await (manager as any).normalizeMessageForDomain("30", "fashion", [{
      role: "assistant",
      content: "Your White shirt is a great choice! What's your waist size (e.g. 30, 32, 34) so I can match pants in your fit?"
    }]);
    expect(normalized).toBe("I need pants in waist size 30.");
  });

  it("routes order tracking requests to the support engine", async () => {
    const resolved = await (manager as any).resolveDomain("Track my latest order", "support");
    expect(resolved).toBe("support");

    const result = await manager.chat({ message: "Track my latest order", sessionId: "support-order-1", domain: "support" });
    expect(result.domain).toBe("support");
    expect(result.intent).toBe("track_order");
    expect(result.content.toLowerCase()).toContain("order");
  });
});
