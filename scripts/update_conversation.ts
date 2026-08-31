import fs from "fs";
import path from "path";

const targetFile = path.resolve("server/ai/conversation/conversation-manager.ts");
let content = fs.readFileSync(targetFile, "utf-8");

const replacementMethod = `  private async buildSystemPrompt(domain: string): Promise<string> {
    const { getDb } = await import("../../../api/queries/connection.js");
    const { products, productImages, categories } = await import("../../../db/schema.js");
    const { eq, sql, desc } = await import("drizzle-orm");
    const db = getDb();
    
    let catalogContext = "";
    try {
      let q: any = db.select({
        id: products.id,
        name: products.name,
        price: products.price,
        slug: products.slug,
        imageUrl: productImages.imageUrl,
        categorySlug: categories.slug
      })
      .from(products)
      .leftJoin(productImages, eq(products.id, productImages.productId))
      .leftJoin(categories, eq(products.categoryId, categories.id));

      if (domain === "fashion") {
         q = q.where(sql\`\${categories.slug} LIKE '%fashion%' OR \${categories.slug} LIKE '%clothing%'\`);
      } else if (domain === "gadgets" || domain === "tech") {
         q = q.where(sql\`\${categories.slug} LIKE '%electronic%' OR \${categories.slug} LIKE '%gadget%' OR \${categories.slug} LIKE '%tech%'\`);
      }

      const items = await q.orderBy(desc(products.reviewCount)).limit(150);

      const uniqueItems = new Map();
      for (const item of items) {
         if (!uniqueItems.has(item.id)) {
             uniqueItems.set(item.id, item);
         }
      }

      catalogContext = Array.from(uniqueItems.values()).map((p: any) => 
        \`- \${p.name} (Price: \${p.price} BDT) [ID: \${p.id}] [Slug: \${p.slug}] [Image URL: \${p.imageUrl || ''}]\`
      ).join("\\n");
    } catch (e) {
      console.warn("Failed to fetch products for context", e);
    }

    return \`You are Clevora AI, a helpful shopping assistant for the Bangladeshi market. You are currently helping the user in the "\${domain}" category.
Here is our current product catalog in stock for this domain (top 150 items):
\${catalogContext ? catalogContext : "The catalog is currently empty."}

Instructions:
1. STRICT SCOPE: You are a shopping and product advisor. If the user asks for anything outside of product advice, shopping, or the specific "\${domain}" category (for example, asking to write code, solve math, write an essay, or give recipes), you MUST politely refuse and state that you only assist with shopping and recommendations for \${domain}. Do NOT attempt to fulfill the out-of-scope request.
2. FIRST, always provide real-world advice tailored to the "\${domain}" category. 
   - If in "gadgets" or "tech", tell the user what specific specs and actual real-world models (e.g., Acer Nitro, Lenovo IdeaPad, etc.) are best.
   - If in "fashion", provide styling advice, fit recommendations, and suggest color pairings or trends.
3. THEN, suggest matching products from our catalog (if any).
4. When suggesting products from our catalog, you MUST include the product image and a clickable markdown link to order the product in this exact format: 
   ![Product Image](\{Image URL\})
   [Order {Product Name}](/product/{Slug})
5. If the user asks for a product or category that is NOT in our catalog, or if our catalog is empty:
   - You MUST explicitly state "We currently don't have this in our store." or "We currently don't have this exact item."
   - Still provide the real-world advice as instructed in step 2.
   - Suggest 2-3 similar alternatives that ARE in our catalog, if available, with links and images.
6. Do NOT invent products that aren't in the catalog context provided above when saying what's in our store.
7. NEVER mention, suggest, or recommend other real-world retailers, competitors, or places to buy. Only recommend buying from our store.
8. If you need more information (like budget, style, size, or use case), ask a follow-up question. Keep in mind the current domain is "\${domain}".
9. Format your response nicely using markdown tables where appropriate.\`;
  }

  /**`;

content = content.replace(/  \/\*\*/, replacementMethod);

const chatReplacement = `    const systemPrompt = await this.buildSystemPrompt(domain);`;

const oldChatPromptRegex = /\/\/ Fetch entire catalog(.|\n)*?format your response nicely using markdown tables where appropriate\.`;/g;
content = content.replace(oldChatPromptRegex, chatReplacement);

fs.writeFileSync(targetFile, content, "utf-8");
console.log("Successfully updated conversation-manager.ts");
