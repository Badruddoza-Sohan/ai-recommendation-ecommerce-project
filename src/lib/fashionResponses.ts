import type { FashionNlpResult } from "./fashionNlp";

/**
 * Helper to pick a random item from an array
 */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Formats an array of items into a nice comma-separated list (e.g., "red, blue, and green")
 */
function formatList(items: string[]): string {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export interface StylistProfileContext {
  name?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  stylePreference?: string | null;
  budgetRange?: string | null;
}

/**
 * Generates a humanized conversational response based on the NLP extracted intent.
 */
export function generateFashionResponse(result: FashionNlpResult, profile?: StylistProfileContext | null): string {
  const { intent, occasion, colors, season, style } = result;

  const greeting = profile?.name ? `Hey ${profile.name}! 👋 Welcome to Clevora AI.` : "Hi! 👋 Welcome to Clevora AI.";

  switch (intent) {
    case "greeting":
      return randomPick([
        `${greeting} I'm here to help you build the perfect outfit. What are you shopping for today?\n\n(Men's Fashion, Women's Fashion, Traditional Wear, Eid, Wedding, Office, Casual)`,
        `Salam & Hello! ✨ Welcome to Clevora AI — your intelligent shopping assistant! What occasion are you getting ready for today?`,
        `Hello! 👋 Welcome to Clevora AI! I'm ready to curate your perfect outfit for today. What are you shopping for?`,
      ]);

    case "thanks":
      return randomPick([
        "You're so welcome! Let me know if you need help with anything else. 💖",
        "Thank you! Happy shopping and stay stylish! ✨",
        "Anytime! I'm always here if you need more fashion advice or matching accessories. 👗👕",
      ]);

    case "goodbye":
      return randomPick([
        "Goodbye! Have a fantastic day and stay fabulous! 👋",
        "See you again soon! Stay stylish! ✨",
        "Bye! Catch you next time! 🌟",
      ]);

    case "outfit":
      if (occasion) {
        return `Here is a curated outfit designed for your ${occasion}: ✨`;
      }
      return "I'd love to suggest an outfit! What is the occasion you're dressing for? (e.g. Gym, Wedding, Eid, Office, Casual, Pohela Boishakh)";

    case "color":
      if (colors && colors.length > 0) {
        const colorStr = formatList(colors.map(c => `**${c}**`));
        return randomPick([
          `Great choice! ${colorStr} is a fantastic color to work with. Here are matching colors and accessories that complement it perfectly: 🎨`,
          `${colorStr}? Classic! Let's look at some matching colors that will complete your look:`,
        ]);
      }
      return randomPick([
        "Color matching is so important! Which specific color are you trying to match? 🎨",
        "Let me know which color you'd like to build an outfit around!",
      ]);

    case "seasonal":
      if (season) {
        return randomPick([
          `The ${season} season in Bangladesh requires the right balance of comfort and style! Here is what I recommend for ${season}: 🍂🌸`,
          `Ah, ${season} fashion! Lightweight cottons for summer, quick-dry dark fabrics for monsoon, or stylish layers for winter:`,
        ]);
      }
      return randomPick([
        "Which season are you shopping for? (Summer, Monsoon, Winter)",
        "Which season's fabric and style recommendations are you looking for?",
      ]);

    case "occasion":
      if (occasion) {
        return randomPick([
          `Getting ready for a ${occasion}? Here is a complete styling guide with accessories to match: ✨`,
          `A ${occasion} calls for a specific vibe. Here are my top recommendations for what to wear:`,
        ]);
      }
      return randomPick([
        "Occasion styling is my specialty! What kind of event are you attending?",
        "Do you have a specific upcoming event (Eid, Wedding, Holud, Office, Party) in mind?",
      ]);

    case "style":
      if (style) {
        return randomPick([
          `The ${style} aesthetic is so chic! Here are the key items you need to master this look: 👗`,
          `Want to nail the ${style} look? Here's your comprehensive style guide:`,
        ]);
      }
      return randomPick([
        "What kind of style do you prefer? (Minimal, Smart Casual, Traditional, Streetwear, Formal)",
      ]);

    case "trends":
      return randomPick([
        "Let me share the latest fashion trends taking over right now! 🔥",
        "Here are the top trending styles and seasonal collections currently in demand:",
      ]);

    case "general":
    default:
      return randomPick([
        `${greeting}\n\nWhat are you shopping for today?\n• Men's Fashion\n• Women's Fashion\n• Traditional Wear\n• Casual / Office / Wedding / Eid`,
        `${greeting} I am Clevora AI, your intelligent shopping assistant! Feel free to ask me for outfit recommendations, tech advice, or general shopping help.`,
      ]);
  }
}
