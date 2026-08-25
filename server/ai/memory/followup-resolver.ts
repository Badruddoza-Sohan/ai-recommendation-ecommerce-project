export type FollowupAction =
  | "request_another_option"
  | "make_cheaper"
  | "increase_formality"
  | "decrease_formality"
  | "change_shoes"
  | "keep_top"
  | "change_shirt_only"
  | "change_colors"
  | "remove_accessories"
  | "black_version"
  | "women_version"
  | "explain_reasoning"
  | "select_specific_option"
  | "reset_conversation"
  | "none";

export interface ContextualModifier {
  action: FollowupAction;
  target_option_index?: number;
  new_color_preference?: string;
  item_type?: "shoes" | "top" | "bottom" | "watch";
}

export class FollowupResolver {
  public parseFollowupQuery(queryText: string): ContextualModifier {
    const q = queryText.toLowerCase();

    // 1. Explicit Reset Request
    if (q.includes("start over") || q.includes("reset conversation") || q.includes("new consultation") || q.includes("নতুন শুরু")) {
      return { action: "reset_conversation" };
    }

    // 2. Request Another Option / Different Combination / Another Style
    if (
      q.includes("another option") ||
      q.includes("another combination") ||
      q.includes("different combination") ||
      q.includes("another style") ||
      q.includes("different style") ||
      q.includes("another one") ||
      q.includes("next look") ||
      q.includes("different look") ||
      q.includes("show me another") ||
      q.includes("🔄")
    ) {
      return { action: "request_another_option" };
    }

    // 3. Make Cheaper / Budget Option
    if (q.includes("cheaper") || q.includes("make it cheaper") || q.includes("less expensive") || q.includes("lower budget") || q.includes("budget friendly")) {
      return { action: "make_cheaper" };
    }

    // 4. Formality / Make Premium
    if (
      q.includes("more premium") ||
      q.includes("make premium") ||
      q.includes("make it more premium") ||
      q.includes("make it premium") ||
      q.includes("upgrade") ||
      q.includes("more formal") ||
      q.includes("higher formality") ||
      q.includes("💎")
    ) {
      return { action: "increase_formality" };
    }
    if (q.includes("more casual") || q.includes("less formal")) {
      return { action: "decrease_formality" };
    }

    // 5. Item Lock / Modification Directives (e.g. "change only shoes", "different shoes")
    if (
      q.includes("change only shoes") ||
      q.includes("change only the shoes") ||
      q.includes("change shoes") ||
      q.includes("different shoes") ||
      q.includes("change footwear") ||
      q.includes("different footwear") ||
      q.includes("other shoes") ||
      q.includes("shoes only") ||
      q.includes("don't like brown") ||
      q.includes("dont like brown") ||
      q.includes("no brown") ||
      q.includes("keep the shoes") ||
      q.includes("same shoes") ||
      q.includes("👞")
    ) {
      return { action: "change_shoes", item_type: "shoes" };
    }

    if (q.includes("keep the shirt") || q.includes("keep the panjabi") || q.includes("keep top")) {
      return { action: "keep_top" };
    }
    if (q.includes("change only the shirt") || q.includes("change panjabi") || q.includes("another panjabi") || q.includes("change top")) {
      return { action: "change_shirt_only", item_type: "top" };
    }

    // 6. Color & Palette Variations
    if (
      q.includes("different colour") ||
      q.includes("different colours") ||
      q.includes("different color") ||
      q.includes("different colors") ||
      q.includes("try different colour") ||
      q.includes("try different colours") ||
      q.includes("try different color") ||
      q.includes("try different colors") ||
      q.includes("another colour") ||
      q.includes("another color") ||
      q.includes("change colour") ||
      q.includes("change color") ||
      q.includes("other colours") ||
      q.includes("other colors") ||
      q.includes("🎨")
    ) {
      return { action: "change_colors" };
    }
    if (q.includes("same outfit in black") || q.includes("make it black") || q.includes("in black")) {
      return { action: "black_version", new_color_preference: "Black" };
    }

    // 7. Reasoning
    if (q.includes("explain why") || q.includes("why this works") || q.includes("reasoning")) {
      return { action: "explain_reasoning" };
    }

    return { action: "none" };
  }
}

let instance: FollowupResolver | null = null;
export function getFollowupResolver(): FollowupResolver {
  if (!instance) instance = new FollowupResolver();
  return instance;
}
