export class HumanToneSynthesizer {
  private englishGreetings = [
    "That sounds like a wonderful occasion!",
    "I'd love to help you put together an elegant look for this.",
    "Let's build a fantastic outfit tailored specifically for your event.",
    "That's an exciting event! Here is how we can style it perfectly.",
  ];

  private banglaGreetings = [
    "অনুষ্ঠানটি চমৎকার হতে যাচ্ছে!",
    "আপনার এই স্পেশাল ইভেন্টের জন্য সেরা একটি আউটফিট বেছে দিতে পারলে খুব ভালো লাগবে।",
    "চলুন আপনার পছন্দ অনুযায়ী একদম মানানসই একটা লুক তৈরি করি।",
  ];

  public getRandomGreeting(lang: "English" | "Bangla" = "English"): string {
    const list = lang === "Bangla" ? this.banglaGreetings : this.englishGreetings;
    return list[Math.floor(Math.random() * list.length)];
  }

  public getTransitionPhrase(occasion?: string): string {
    if (!occasion) return "Considering your preferences, here is the look I recommend:";
    return `For a ${occasion}, where elegance and comfort meet, here is the styled ensemble:`;
  }
}

let instance: HumanToneSynthesizer | null = null;
export function getHumanToneSynthesizer(): HumanToneSynthesizer {
  if (!instance) instance = new HumanToneSynthesizer();
  return instance;
}
