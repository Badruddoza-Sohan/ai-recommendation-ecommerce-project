import { getDb } from "../../../api/queries/connection.ts";
import { products, productImages } from "../../../db/schema.ts";
import { like, and, or, sql, eq } from "../../../db/mysql.ts";

export interface SearchCriteria {
  keywords: string[];
  excludedKeywords: string[];
  maxPrice?: number;
  category?: "electronics" | "fashion" | "general";
  limit?: number;
}

export class CatalogSearchEngine {
  async search(criteria: SearchCriteria) {
    const db = getDb();
    const conditions = [];

    // Filter active only
    conditions.push(eq(products.status, "active"));

    // Excluded keywords (e.g. no black, no sneakers)
    for (const word of criteria.excludedKeywords) {
      if (word.trim().length > 0) {
        conditions.push(
          sql`LOWER(${products.name}) NOT LIKE ${`%${word.toLowerCase()}%`}`
        );
        conditions.push(
          sql`LOWER(${products.tags}) NOT LIKE ${`%${word.toLowerCase()}%`}`
        );
      }
    }

    // Inclusion keywords (match ANY of the positive keywords for a broader recall)
    if (criteria.keywords.length > 0) {
      const orConditions = criteria.keywords.map(kw => {
        const lower = kw.toLowerCase();
        return or(
          like(products.name, `%${lower}%`),
          like(products.tags, `%${lower}%`),
          like(products.attributes, `%${lower}%`) // JSON search inside string
        );
      });
      conditions.push(or(...orConditions));
    }

    if (criteria.maxPrice) {
      conditions.push(sql`${products.price} <= ${criteria.maxPrice}`);
    }

    if (criteria.category) {
      const categoryId = criteria.category === "electronics" ? 1 : 
                         criteria.category === "fashion" ? 2 : 
                         criteria.category === "general" ? 3 : null;
      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        description: products.shortDescription,
        attributes: products.attributes,
        imageUrl: productImages.imageUrl,
        sku: products.sku,
        slug: products.slug
      })
      .from(products)
      .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
      .where(where)
      .limit(criteria.limit || 5);

    // Parse attributes for easier consumption by AI
    return items.map(item => ({
      ...item,
      attributes: typeof item.attributes === "string" ? JSON.parse(item.attributes) : item.attributes
    }));
  }
}

let instance: CatalogSearchEngine;
export function getCatalogSearchEngine() {
  if (!instance) {
    instance = new CatalogSearchEngine();
  }
  return instance;
}
