export class ProactiveAdviceEngine {
  public getGarmentCareAdvice(category?: string): string {
    if (category?.toLowerCase().includes("panjabi") || category?.toLowerCase().includes("traditional")) {
      return "💡 *Pro Stylist Tip*: Gently steam your silk/cotton Panjabi before the event rather than heavy ironing to preserve the rich luster and embroidery texture.";
    }
    if (category?.toLowerCase().includes("shoe") || category?.toLowerCase().includes("nagra")) {
      return "💡 *Pro Stylist Tip*: Leather Nagra shoes become exceptionally soft after a brief 1-2 hour break-in period around the house before your event.";
    }
    return "💡 *Pro Stylist Tip*: A subtle dab of natural Rose Attar on pulse points will elevate this look elegantly throughout the evening.";
  }

  public getInvitingCloser(lang = "English"): string {
    if (lang === "Bangla") {
      return "আপনি চাইলে আমি এই আউটফিটের সাথে মানানসই একটি ওয়াচ বা ঘ্রাণযুক্ত আতরও রেকমেন্ড করতে পারি!";
    }
    return "If you'd like, I can also suggest a matching minimalist watch, cufflinks, or a complementary fragrance for the evening!";
  }
}

let instance: ProactiveAdviceEngine | null = null;
export function getProactiveAdviceEngine(): ProactiveAdviceEngine {
  if (!instance) instance = new ProactiveAdviceEngine();
  return instance;
}
