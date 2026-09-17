import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { eq } from "../db/mysql";
import * as schema from "../db/schema";
import { getDb } from "./queries/connection";

const saveProfileSchema = z.object({
  gender: z.string().optional(),
  ageGroup: z.string().optional(),
  stylePreference: z.string().optional(),
  budgetRange: z.string().optional(),
  favoriteColors: z.array(z.string()).optional(),
});

export const stylistProfileRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;
    const profiles = await db
      .select()
      .from(schema.stylistProfiles)
      .where(eq((schema.stylistProfiles as any).userId, userId))
      .limit(1);
    
    return profiles[0] || null;
  }),

  save: authedQuery
    .input(saveProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      
      const existingRows = await db
        .select()
        .from(schema.stylistProfiles)
        .where(eq((schema.stylistProfiles as any).userId, userId))
        .limit(1);

      const existing = existingRows[0];

      if (existing) {
        // Update
        await db
          .update(schema.stylistProfiles)
          .set({
            gender: input.gender ?? existing.gender,
            ageGroup: input.ageGroup ?? existing.ageGroup,
            stylePreference: input.stylePreference ?? existing.stylePreference,
            budgetRange: input.budgetRange ?? existing.budgetRange,
            favoriteColors: JSON.stringify(input.favoriteColors ?? existing.favoriteColors),
            updatedAt: Date.now(),
          })
          .where(eq((schema.stylistProfiles as any).userId, userId));
      } else {
        // Create
        await db
          .insert(schema.stylistProfiles)
          .values({
            userId: userId,
            gender: input.gender,
            ageGroup: input.ageGroup,
            stylePreference: input.stylePreference,
            budgetRange: input.budgetRange,
            favoriteColors: JSON.stringify(input.favoriteColors || []),
          });
      }

      const updatedRows = await db
        .select()
        .from(schema.stylistProfiles)
        .where(eq((schema.stylistProfiles as any).userId, userId))
        .limit(1);

      return updatedRows[0];
    }),
});
