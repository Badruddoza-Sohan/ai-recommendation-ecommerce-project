import { describe, it, expect } from "vitest";
import {
  containsWakeWord,
  extractVoiceCommand,
  isNavigationCommand,
  isSearchCommand,
  extractSearchQuery,
} from "./voiceAssistantHelpers";

// Mock vitest config issue by ensuring describe is available
describe("voice assistant wake word helpers", () => {
  it("detects hey maya in transcripts", () => {
    expect(containsWakeWord("Hey Maya, search for shoes")).toBe(true);
    expect(containsWakeWord("open products")).toBe(false);
    expect(containsWakeWord("hey maya go to cart")).toBe(true);
    expect(containsWakeWord("Hey, Maya open products")).toBe(true);
    expect(containsWakeWord("hey  maya test")).toBe(true);
  });

  it("detects hey maya variations", () => {
    expect(containsWakeWord("hey maya")).toBe(true);
    expect(containsWakeWord("Hey Maya")).toBe(true);
    expect(containsWakeWord("hey, maya")).toBe(true);
    expect(containsWakeWord("HEY MAYA")).toBe(true);
  });

  it("does not trigger on similar phrases", () => {
    expect(containsWakeWord("hey")).toBe(false);
    expect(containsWakeWord("maya")).toBe(false);
    expect(containsWakeWord("hey everyone")).toBe(false);
    expect(containsWakeWord("say maya")).toBe(false);
    expect(containsWakeWord("hey mary")).toBe(false);
  });

  it("extracts the command after the wake phrase", () => {
    expect(extractVoiceCommand("Hey Maya, open products")).toBe(
      "open products"
    );
    expect(extractVoiceCommand("hey maya go to cart")).toBe("go to cart");
    expect(extractVoiceCommand("Hey, Maya search for headphones")).toBe(
      "search for headphones"
    );
    expect(extractVoiceCommand("hey maya   describe this page")).toBe(
      "describe this page"
    );
  });

  it("returns the full command when no wake word present", () => {
    expect(extractVoiceCommand("open products")).toBe("open products");
    expect(extractVoiceCommand("go to cart")).toBe("go to cart");
  });
});

describe("isNavigationCommand", () => {
  it("detects navigation commands correctly", () => {
    expect(isNavigationCommand("go to home")).toBe(true);
    expect(isNavigationCommand("open cart")).toBe(true);
    expect(isNavigationCommand("navigate to products")).toBe(true);
    expect(isNavigationCommand("take me to my profile")).toBe(true);
    expect(isNavigationCommand("show wishlist")).toBe(true);
    expect(isNavigationCommand("open seller dashboard")).toBe(true);
    expect(isNavigationCommand("go to checkout")).toBe(true);
  });

  it("does not flag non-navigation commands", () => {
    expect(isNavigationCommand("search for headphones")).toBe(false);
    expect(isNavigationCommand("what is on this page")).toBe(false);
    expect(isNavigationCommand("hello")).toBe(false);
  });
});

describe("isSearchCommand", () => {
  it("detects search commands correctly", () => {
    expect(isSearchCommand("search for headphones")).toBe(true);
    expect(isSearchCommand("find shoes")).toBe(true);
    expect(isSearchCommand("look for laptop")).toBe(true);
    expect(isSearchCommand("show me dresses")).toBe(true);
    expect(isSearchCommand("discover products")).toBe(true);
  });

  it("does not flag non-search commands", () => {
    expect(isSearchCommand("go to cart")).toBe(false);
    expect(isSearchCommand("open products")).toBe(false);
    expect(isSearchCommand("help")).toBe(false);
  });
});

describe("extractSearchQuery", () => {
  it("extracts search terms correctly", () => {
    expect(extractSearchQuery("search for headphones")).toBe("headphones");
    expect(extractSearchQuery("find shoes")).toBe("shoes");
    expect(extractSearchQuery("look for laptop")).toBe("laptop");
    expect(extractSearchQuery("show me dresses")).toBe("dresses");
  });

  it("returns null when no search query found", () => {
    expect(extractSearchQuery("go to cart")).toBeNull();
    expect(extractSearchQuery("hello")).toBeNull();
  });
});