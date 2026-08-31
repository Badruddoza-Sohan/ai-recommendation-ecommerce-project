/**
 * Intent Training Data
 *
 * High-quality, diverse examples for intent classification.
 * Replaces the 573-example SEED_CORPUS with ~220 carefully curated examples
 * covering English, Banglish, and Bengali.
 *
 * These are embedded at startup and stored in the "intents" vector collection.
 */

import type { TrainingExample } from "./types.ts";

export const INTENT_TRAINING_DATA: TrainingExample[] = [
  // ═══════════════════════════════════════════════════════════════
  // SUPPORT DOMAIN
  // ═══════════════════════════════════════════════════════════════

  // greeting
  { domain: "support", intent: "greeting", text: "hello" },
  { domain: "support", intent: "greeting", text: "hi there, I need help" },
  { domain: "support", intent: "greeting", text: "good morning, can you assist me?" },
  { domain: "support", intent: "greeting", text: "hey I have a question" },

  // goodbye
  { domain: "support", intent: "goodbye", text: "thanks for your help, bye" },
  { domain: "support", intent: "goodbye", text: "that's all I needed, goodbye" },
  { domain: "support", intent: "goodbye", text: "I'm done, thank you" },

  // order_status
  { domain: "support", intent: "order_status", text: "where is my order?" },
  { domain: "support", intent: "order_status", text: "can you track my package ORD-2024-0001?" },
  { domain: "support", intent: "order_status", text: "what is the status of my delivery?" },
  { domain: "support", intent: "order_status", text: "I placed an order 3 days ago, still not received" },
  { domain: "support", intent: "order_status", text: "my order is taking too long" },
  { domain: "support", intent: "order_status", text: "has my order been shipped yet?" },
  // Banglish
  { domain: "support", intent: "order_status", text: "amar order koi?" },
  { domain: "support", intent: "order_status", text: "order ta ki pathano hoyeche?" },
  { domain: "support", intent: "order_status", text: "delivery kobe ashbe?" },
  // Bengali
  { domain: "support", intent: "order_status", text: "আমার অর্ডার কোথায়?" },
  { domain: "support", intent: "order_status", text: "আমার পার্সেল কবে আসবে?" },

  // order_cancel
  { domain: "support", intent: "order_cancel", text: "I want to cancel my order" },
  { domain: "support", intent: "order_cancel", text: "please cancel order ORD-2024-0001" },
  { domain: "support", intent: "order_cancel", text: "how do I cancel before it ships?" },
  { domain: "support", intent: "order_cancel", text: "I changed my mind, cancel this" },
  { domain: "support", intent: "order_cancel", text: "cancel kora jabe?" },
  { domain: "support", intent: "order_cancel", text: "অর্ডার বাতিল করতে চাই" },

  // order_return
  { domain: "support", intent: "order_return", text: "I want to return this item" },
  { domain: "support", intent: "order_return", text: "how do I get a refund?" },
  { domain: "support", intent: "order_return", text: "the product is defective, I need to send it back" },
  { domain: "support", intent: "order_return", text: "wrong item was delivered, need to return" },
  { domain: "support", intent: "order_return", text: "what is your return policy?" },
  { domain: "support", intent: "order_return", text: "refund chai, product ta bhalo na" },
  { domain: "support", intent: "order_return", text: "রিফান্ড পেতে চাই" },

  // shipping_info
  { domain: "support", intent: "shipping_info", text: "how long does standard shipping take?" },
  { domain: "support", intent: "shipping_info", text: "what are the delivery charges?" },
  { domain: "support", intent: "shipping_info", text: "do you offer free shipping?" },
  { domain: "support", intent: "shipping_info", text: "what is express delivery cost?" },
  { domain: "support", intent: "shipping_info", text: "shipping charge koto?" },
  { domain: "support", intent: "shipping_info", text: "ডেলিভারি কতদিনে হবে?" },

  // payment_methods
  { domain: "support", intent: "payment_methods", text: "what payment methods do you accept?" },
  { domain: "support", intent: "payment_methods", text: "can I pay with bKash?" },
  { domain: "support", intent: "payment_methods", text: "do you accept Nagad or Rocket?" },
  { domain: "support", intent: "payment_methods", text: "I want to pay cash on delivery" },
  { domain: "support", intent: "payment_methods", text: "is credit card payment available?" },
  { domain: "support", intent: "payment_methods", text: "bKash e payment dewa jabe?" },
  { domain: "support", intent: "payment_methods", text: "কিভাবে পেমেন্ট করব?" },

  // account_help
  { domain: "support", intent: "account_help", text: "I forgot my password" },
  { domain: "support", intent: "account_help", text: "can't login to my account" },
  { domain: "support", intent: "account_help", text: "how do I reset my password?" },
  { domain: "support", intent: "account_help", text: "I want to change my email address" },
  { domain: "support", intent: "account_help", text: "my account is locked" },
  { domain: "support", intent: "account_help", text: "password bhule gachi, ki korbo?" },

  // product_info
  { domain: "support", intent: "product_info", text: "what sizes are available for this shirt?" },
  { domain: "support", intent: "product_info", text: "what material is this product made of?" },
  { domain: "support", intent: "product_info", text: "is this item in stock?" },
  { domain: "support", intent: "product_info", text: "tell me more about this product" },
  { domain: "support", intent: "product_info", text: "what colors does this come in?" },

  // complaint
  { domain: "support", intent: "complaint", text: "I received a damaged item" },
  { domain: "support", intent: "complaint", text: "this is not what I ordered" },
  { domain: "support", intent: "complaint", text: "the quality is very poor, I'm disappointed" },
  { domain: "support", intent: "complaint", text: "I've been waiting 2 weeks and nothing arrived" },
  { domain: "support", intent: "complaint", text: "this is unacceptable, I want to complain" },
  { domain: "support", intent: "complaint", text: "product ta nosto asche, ki khorob!" },
  { domain: "support", intent: "complaint", text: "পণ্যটি নষ্ট অবস্থায় এসেছে" },

  // cart_help
  { domain: "support", intent: "cart_help", text: "I can't add this to my cart" },
  { domain: "support", intent: "cart_help", text: "my cart is empty after login" },
  { domain: "support", intent: "cart_help", text: "I'm having trouble checking out" },

  // escalate_human
  { domain: "support", intent: "escalate_human", text: "I want to speak to a human agent" },
  { domain: "support", intent: "escalate_human", text: "connect me to someone real" },
  { domain: "support", intent: "escalate_human", text: "this bot isn't helping, I need a person" },
  { domain: "support", intent: "escalate_human", text: "talk to customer service representative" },

  // ═══════════════════════════════════════════════════════════════
  // FASHION DOMAIN
  // ═══════════════════════════════════════════════════════════════

  // outfit_recommendation
  { domain: "fashion", intent: "outfit_recommendation", text: "what should I wear to a wedding?" },
  { domain: "fashion", intent: "outfit_recommendation", text: "suggest an outfit for a job interview" },
  { domain: "fashion", intent: "outfit_recommendation", text: "I need outfit ideas for a casual brunch" },
  { domain: "fashion", intent: "outfit_recommendation", text: "recommend something for Eid" },
  { domain: "fashion", intent: "outfit_recommendation", text: "I'm going on a date, what should I wear?" },
  { domain: "fashion", intent: "outfit_recommendation", text: "panjabi suggest koro Eid er jonno" },
  { domain: "fashion", intent: "outfit_recommendation", text: "বিয়েতে কী পরব?" },

  // color_matching
  { domain: "fashion", intent: "color_matching", text: "what colors go with navy blue?" },
  { domain: "fashion", intent: "color_matching", text: "I have a red dress, what shoes should I wear?" },
  { domain: "fashion", intent: "color_matching", text: "what color combination looks good for summer?" },
  { domain: "fashion", intent: "color_matching", text: "how to match colors for my outfit?" },

  // product_recommendation (fashion)
  { domain: "fashion", intent: "product_recommendation", text: "show me white sneakers under 4000 taka" },
  { domain: "fashion", intent: "product_recommendation", text: "I need a formal shirt, budget is 2000" },
  { domain: "fashion", intent: "product_recommendation", text: "find me a saree for a function" },
  { domain: "fashion", intent: "product_recommendation", text: "I want a winter jacket, affordable" },
  { domain: "fashion", intent: "product_recommendation", text: "lehenga ki ache? price 5000 er moddhe" },

  // style_guidance
  { domain: "fashion", intent: "style_guidance", text: "what is minimalist fashion?" },
  { domain: "fashion", intent: "style_guidance", text: "how to dress for my body type?" },
  { domain: "fashion", intent: "style_guidance", text: "give me fashion tips for office wear" },

  // seasonal_trends
  { domain: "fashion", intent: "seasonal_trends", text: "what's trending this summer?" },
  { domain: "fashion", intent: "seasonal_trends", text: "what to wear in winter in Dhaka?" },
  { domain: "fashion", intent: "seasonal_trends", text: "best fashion for monsoon season?" },

  // complete_the_look & mix_and_match full sentences
  { domain: "fashion", intent: "complete_the_look", text: "I have a black blazer, what else do I need?" },
  { domain: "fashion", intent: "complete_the_look", text: "what accessories go with this dress?" },
  { domain: "fashion", intent: "complete_the_look", text: "suggest shoes to match my outfit" },
  { domain: "fashion", intent: "complete_the_look", text: "i have white pant and black shoe what should be my complete outfit" },
  { domain: "fashion", intent: "complete_the_look", text: "I have a navy blazer and brown loafers, what pants and shirt should I wear?" },
  { domain: "fashion", intent: "complete_the_look", text: "I already have black jeans, suggest a shirt and shoes for a date night" },
  { domain: "fashion", intent: "complete_the_look", text: "I have a white panjabi, what pajama and nagra shoe match it?" },
  { domain: "fashion", intent: "complete_the_look", text: "I own a red saree, what blouse and jewelry go best for Eid?" },
  { domain: "fashion", intent: "complete_the_look", text: "amar kache sada pant ar kalo juta ache, full outfit ki hobe?" },
  { domain: "fashion", intent: "complete_the_look", text: "আমার কাছে কালো জিন্স আছে, সাথে কি শার্ট পরব?" },

  // ═══════════════════════════════════════════════════════════════
  // VOICE DOMAIN
  // ═══════════════════════════════════════════════════════════════

  // search
  { domain: "voice", intent: "search", text: "find me red sneakers" },
  { domain: "voice", intent: "search", text: "search for men's formal shirts" },
  { domain: "voice", intent: "search", text: "show me products under 1000 taka" },
  { domain: "voice", intent: "search", text: "look for kurta for men" },

  // navigate
  { domain: "voice", intent: "navigate", text: "go to my cart" },
  { domain: "voice", intent: "navigate", text: "take me to my orders" },
  { domain: "voice", intent: "navigate", text: "open the categories page" },
  { domain: "voice", intent: "navigate", text: "go to my wishlist" },

  // add_to_cart
  { domain: "voice", intent: "add_to_cart", text: "add this to my cart" },
  { domain: "voice", intent: "add_to_cart", text: "I'll take this one" },
  { domain: "voice", intent: "add_to_cart", text: "buy this item" },

  // checkout
  { domain: "voice", intent: "checkout", text: "proceed to checkout" },
  { domain: "voice", intent: "checkout", text: "I'm ready to pay" },
  { domain: "voice", intent: "checkout", text: "place my order" },

  // help
  { domain: "voice", intent: "help", text: "what can you do?" },
  { domain: "voice", intent: "help", text: "how do I use the voice assistant?" },

  // ═══════════════════════════════════════════════════════════════
  // SELLER DOMAIN
  // ═══════════════════════════════════════════════════════════════

  // product_description
  { domain: "seller", intent: "product_description", text: "write a product description for my shirt" },
  { domain: "seller", intent: "product_description", text: "generate listing copy for this item" },
  { domain: "seller", intent: "product_description", text: "help me write a compelling product title" },

  // keywords_seo
  { domain: "seller", intent: "keywords_seo", text: "what keywords should I use for this product?" },
  { domain: "seller", intent: "keywords_seo", text: "help me with SEO tags" },
  { domain: "seller", intent: "keywords_seo", text: "suggest search terms for my listing" },

  // inventory_alert
  { domain: "seller", intent: "inventory_alert", text: "which products are running low on stock?" },
  { domain: "seller", intent: "inventory_alert", text: "check my inventory levels" },
  { domain: "seller", intent: "inventory_alert", text: "what needs to be restocked?" },

  // pricing_advice
  { domain: "seller", intent: "pricing_advice", text: "how should I price this product?" },
  { domain: "seller", intent: "pricing_advice", text: "what is a competitive price for a cotton shirt?" },
  { domain: "seller", intent: "pricing_advice", text: "should I lower my prices to increase sales?" },

  // analytics_insights
  { domain: "seller", intent: "analytics_insights", text: "show me my sales performance" },
  { domain: "seller", intent: "analytics_insights", text: "what are my best selling products?" },
  { domain: "seller", intent: "analytics_insights", text: "how is my store doing this month?" },

  // ═══════════════════════════════════════════════════════════════
  // RECOMMENDATION DOMAIN
  // ═══════════════════════════════════════════════════════════════

  // similar_products
  { domain: "recommendation", intent: "similar_products", text: "show me similar products" },
  { domain: "recommendation", intent: "similar_products", text: "find alternatives to this item" },
  { domain: "recommendation", intent: "similar_products", text: "what else is like this product?" },

  // complementary_products
  { domain: "recommendation", intent: "complementary_products", text: "what goes well with this?" },
  { domain: "recommendation", intent: "complementary_products", text: "frequently bought together" },
  { domain: "recommendation", intent: "complementary_products", text: "what should I buy with this jacket?" },

  // trending_products
  { domain: "recommendation", intent: "trending_products", text: "what's popular right now?" },
  { domain: "recommendation", intent: "trending_products", text: "show me the best sellers" },
  { domain: "recommendation", intent: "trending_products", text: "what are people buying most?" },

  // personalized
  { domain: "recommendation", intent: "personalized_recommendations", text: "recommend products for me" },
  { domain: "recommendation", intent: "personalized_recommendations", text: "what do you suggest based on my history?" },
  { domain: "recommendation", intent: "personalized_recommendations", text: "show me personalized picks" },

  // ═══════════════════════════════════════════════════════════════
  // GADGETS DOMAIN
  // ═══════════════════════════════════════════════════════════════

  // laptop_recommendation
  { domain: "gadgets", intent: "laptop_recommendation", text: "what laptop should I buy for programming?" },
  { domain: "gadgets", intent: "laptop_recommendation", text: "suggest a laptop for video editing under 80000 taka" },
  { domain: "gadgets", intent: "laptop_recommendation", text: "best budget laptop for university students" },
  { domain: "gadgets", intent: "laptop_recommendation", text: "recommend a gaming laptop with RTX graphics" },
  { domain: "gadgets", intent: "laptop_recommendation", text: "should I buy MacBook Air M2 or ThinkPad for coding?" },
  { domain: "gadgets", intent: "laptop_recommendation", text: "programming er jonno bhalo laptop ki ache?" },
  { domain: "gadgets", intent: "laptop_recommendation", text: "ভিডিও এডিটিং এর জন্য ল্যাপটপ সাজেস্ট করুন" },

  // pc_build
  { domain: "gadgets", intent: "pc_build", text: "I want to build a gaming PC with 100k BDT budget" },
  { domain: "gadgets", intent: "pc_build", text: "is Ryzen 5 7600 compatible with B650 motherboard?" },
  { domain: "gadgets", intent: "pc_build", text: "check compatibility for my PC build parts" },
  { domain: "gadgets", intent: "pc_build", text: "what power supply do I need for RTX 4070?" },
  { domain: "gadgets", intent: "pc_build", text: "best custom PC build for 4K video editing" },
  { domain: "gadgets", intent: "pc_build", text: "gaming PC banate chai, budget 70k" },

  // tech_comparison
  { domain: "gadgets", intent: "tech_comparison", text: "MacBook vs Windows laptop for software engineering" },
  { domain: "gadgets", intent: "tech_comparison", text: "RTX 3060 vs RTX 4060 which one is better?" },
  { domain: "gadgets", intent: "tech_comparison", text: "DDR4 vs DDR5 RAM difference for gaming" },
  { domain: "gadgets", intent: "tech_comparison", text: "what specs do I need for DaVinci Resolve 4K editing?" },

  // ═══════════════════════════════════════════════════════════════
  // GENERAL DOMAIN
  // ═══════════════════════════════════════════════════════════════

  // product_discovery
  { domain: "general", intent: "product_discovery", text: "help me find a gift for my friend" },
  { domain: "general", intent: "product_discovery", text: "what are the best electronics deals today?" },
  { domain: "general", intent: "product_discovery", text: "recommend some home appliances under 10000 BDT" },
  { domain: "general", intent: "product_discovery", text: "I'm looking for wireless earbuds with good mic" },
  { domain: "general", intent: "product_discovery", text: "amar budget 5000, bhalo smart watch suggest koro" },
  { domain: "general", intent: "product_discovery", text: "ভালো হেডফোন খুঁজছি" },

  // ═══════════════════════════════════════════════════════════════
  // TYPO-TOLERANT EXAMPLES
  // ═══════════════════════════════════════════════════════════════
  { domain: "recommendation", intent: "category_browse", text: "show all catagory" },
  { domain: "recommendation", intent: "category_browse", text: "browse catgory list" },
  { domain: "recommendation", intent: "product_search", text: "search bluetooth hedfone" },
  { domain: "recommendation", intent: "product_search", text: "find headfone" },
  { domain: "recommendation", intent: "product_search", text: "rakib fashoin seller" },
  { domain: "support", intent: "order_status", text: "chkout status notificattionn" },
  { domain: "seller", intent: "pricing_advice", text: "help with product prizing" },
  { domain: "seller", intent: "inventory_alert", text: "check invtory stock" },
];
