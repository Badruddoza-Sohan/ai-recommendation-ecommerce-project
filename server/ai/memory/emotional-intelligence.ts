export type EmotionalState = "nervous" | "excited" | "uncertain" | "confident" | "neutral";

export interface EmpathyAnalysis {
  state: EmotionalState;
  empatheticOpening?: string;
}

export class EmotionalIntelligenceEngine {
  public analyzeEmotion(text: string, lang = "English"): EmpathyAnalysis {
    const q = text.toLowerCase();

    if (q.includes("nervous") || q.includes("anxious") || q.includes("scared") || q.includes("ভয় পাচ্ছি")) {
      const opening = lang === "Bangla"
        ? "চিন্তার একদম কিছু নেই! আপনার ইন্টারভিউ বা অনুষ্ঠানের জন্য আমরা এমন একটি আউটফিট বেছে নেব যা আপনাকে সম্পূর্ণ আত্মবিশ্বাসী করে তুলবে।"
        : "It's completely natural to feel a bit nervous! We'll style an outfit that makes you look sharp and feel 100% confident.";
      return { state: "nervous", empatheticOpening: opening };
    }

    if (q.includes("excited") || q.includes("can't wait") || q.includes("খুব এক্সাইটেড")) {
      const opening = lang === "Bangla"
        ? "কী দারুণ খবর! এই বিশেষ মুহূর্তটিকে আরও স্মরণীয় করে তুলতে চলুন সেরা একটি স্পেশাল লুক তৈরি করি।"
        : "That sounds incredibly exciting! Let's design a memorable, show-stopping look for your special occasion.";
      return { state: "excited", empatheticOpening: opening };
    }

    if (q.includes("never worn") || q.includes("first time") || q.includes("নতুিন") || q.includes("আগে কখনও পরি নাই")) {
      const opening = lang === "Bangla"
        ? "প্রথমবার ট্রেডিশনাল ট্রাই করছেন? একদম চিন্তা করবেন না, খুব সহজ এবং আরামদায়ক একটি স্টাইল দিয়েই শুরু করব।"
        : "Trying traditional wear for the first time? Don't worry at all—I'll guide you step-by-step with a classic, effortless look.";
      return { state: "uncertain", empatheticOpening: opening };
    }

    return { state: "neutral" };
  }
}

let instance: EmotionalIntelligenceEngine | null = null;
export function getEmotionalIntelligenceEngine(): EmotionalIntelligenceEngine {
  if (!instance) instance = new EmotionalIntelligenceEngine();
  return instance;
}
