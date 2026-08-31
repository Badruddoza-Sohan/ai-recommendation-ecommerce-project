import { z } from "zod";

export const UserIntentSchema = z.object({
  ownedItems: z.array(z.string()).describe("Items the user explicitly states they already own. E.g., ['black shirt', 'blue jeans']. Leave empty if none."),
  targetItems: z.array(z.string()).describe("Items the user is looking to buy or wants recommendations for. E.g., ['shoes', 'watch']."),
  excludedPreferences: z.array(z.string()).describe("Colors, styles, or items the user explicitly DOES NOT want. E.g., ['black', 'sneakers']."),
  budget: z.number().nullable().describe("Explicit budget limit in BDT if mentioned, otherwise null."),
  style: z.string().nullable().describe("The requested style, occasion, or use-case (e.g. 'wedding', 'gaming', 'video editing'). Null if not mentioned."),
  additionalConstraints: z.record(z.string()).optional().describe("Any extra technical requirements (e.g. { 'resolution': '1080p', 'software': 'Premiere' })"),
});

export type UserIntent = z.infer<typeof UserIntentSchema>;
