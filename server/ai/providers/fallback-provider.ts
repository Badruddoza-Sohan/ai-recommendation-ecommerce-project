export class FallbackProvider {
  /**
   * If the LLM Gateway fails or is unavailable, this returns a safe default string.
   */
  getFallbackResponse(domain: string, intent: string): string {
    if (domain === "fashion") {
      return "I'm sorry, my fashion assistant module is temporarily offline. Please try browsing the Fashion category from the homepage for now.";
    }
    if (domain === "electronics" || domain === "gadgets") {
      return "My tech assistant module is currently offline. Please check our electronics catalog manually.";
    }
    if (domain === "support") {
      return "Our automated support is currently offline, but you can track your orders from the Orders page or contact a human agent.";
    }
    return "I'm currently unable to connect to my AI brain. Please try again later.";
  }
}

let instance: FallbackProvider;
export function getFallbackProvider() {
  if (!instance) {
    instance = new FallbackProvider();
  }
  return instance;
}
