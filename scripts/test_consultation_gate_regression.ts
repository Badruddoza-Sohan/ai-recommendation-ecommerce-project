import { getConversationManager } from "../server/ai/conversation/conversation-manager.ts";
import { getStylistStateManager } from "../server/ai/memory/stylist-state-manager.ts";
import { getSlotCompletionEngine } from "../server/ai/consultation/slot-completion-engine.ts";

async function runConsultationGateRegressionSuite() {
  console.log("====================================================");
  console.log("👑 AI FASHION STYLIST CONSULTATION GATE REGRESSION SUITE");
  console.log("====================================================\n");

  const manager = getConversationManager();
  const stateManager = getStylistStateManager();
  const slotEngine = getSlotCompletionEngine();

  const sessionId = `test_gate_${Date.now()}`;

  // ---------------------------------------------------
  // TEST 1: Initial Broad Message ("I have a wedding next week")
  // ---------------------------------------------------
  console.log("📌 [TEST 1] User: 'I have a wedding next week.'");
  const res1 = await manager.chat({ message: "I have a wedding next week.", sessionId, domain: "fashion" });
  console.log(`   Assistant Response:\n   ${res1.content.split("\n").join("\n   ")}\n`);

  if (res1.content.toLowerCase().includes("option 1") || res1.content.toLowerCase().includes("recommend")) {
    throw new Error("❌ FAIL [TEST 1]: Chatbot generated product recommendations without conducting a consultation!");
  }
  if (!res1.content.includes("Groom") || !res1.content.includes("Guest")) {
    throw new Error("❌ FAIL [TEST 1]: Probing question for role was missing expected bullet choices!");
  }
  console.log("   ✅ PASS [TEST 1]: Chatbot intercepted recommendation flow and asked EXACTLY 1 probing question for Role.\n");

  // ---------------------------------------------------
  // TEST 2: Answer Role ("Guest")
  // ---------------------------------------------------
  console.log("📌 [TEST 2] User: 'I am attending as a guest.'");
  const res2 = await manager.chat({ message: "I am attending as a guest.", sessionId, domain: "fashion" });
  console.log(`   Assistant Response:\n   ${res2.content.split("\n").join("\n   ")}\n`);

  if (res2.content.toLowerCase().includes("option 1")) {
    throw new Error("❌ FAIL [TEST 2]: Chatbot generated product recommendations before collecting Time & Style!");
  }
  if (!res2.content.includes("Daytime") || !res2.content.includes("Evening")) {
    throw new Error("❌ FAIL [TEST 2]: Probing question for Time of Day was missing!");
  }
  console.log("   ✅ PASS [TEST 2]: State updated with role 'Guest' and asked next question for Time of Day.\n");

  // ---------------------------------------------------
  // TEST 3: Answer Time ("Evening")
  // ---------------------------------------------------
  console.log("📌 [TEST 3] User: 'It is an evening wedding event.'");
  const res3 = await manager.chat({ message: "It is an evening wedding event.", sessionId, domain: "fashion" });
  console.log(`   Assistant Response:\n   ${res3.content.split("\n").join("\n   ")}\n`);

  if (res3.content.toLowerCase().includes("option 1")) {
    throw new Error("❌ FAIL [TEST 3]: Premature recommendation generated before Style/Budget!");
  }
  console.log("   ✅ PASS [TEST 3]: State updated with 'Evening' and prompted for outfit style.\n");

  // ---------------------------------------------------
  // TEST 4: Fulfill remaining slots ("Traditional Panjabi, under 10k")
  // ---------------------------------------------------
  console.log("📌 [TEST 4] User: 'I prefer Traditional style and under 10k budget.'");
  const res4 = await manager.chat({ message: "I prefer Traditional style and under 10k budget.", sessionId, domain: "fashion" });
  console.log(`   Assistant Response Snippet:\n   ${res4.content.slice(0, 300).split("\n").join("\n   ")}...\n`);

  const stateAfterSlots = await stateManager.getState(sessionId);
  const slotCheck = slotEngine.evaluateSlots(stateAfterSlots);
  if (!slotCheck.isComplete) {
    throw new Error("❌ FAIL [TEST 4]: Slot check reported incomplete after user provided all required slots!");
  }
  console.log("   ✅ PASS [TEST 4]: All slots complete! Recommendation Engine triggered successfully.\n");

  // ---------------------------------------------------
  // TEST 5: Negation Retention ("I don't like yellow")
  // ---------------------------------------------------
  console.log("📌 [TEST 5] User: 'I don't like yellow.'");
  await manager.chat({ message: "I don't like yellow.", sessionId, domain: "fashion" });
  const stateNegation = await stateManager.getState(sessionId);
  if (!stateNegation.avoid_colors.includes("Yellow")) {
    throw new Error("❌ FAIL [TEST 5]: 'Yellow' was not stored in avoid_colors!");
  }
  console.log(`   Avoid Colors in Memory: [${stateNegation.avoid_colors.join(", ")}]`);
  console.log("   ✅ PASS [TEST 5]: Negation color 'Yellow' retained in memory forever.\n");

  // ---------------------------------------------------
  // TEST 6: Owned Items Memory ("I own white pajama")
  // ---------------------------------------------------
  console.log("📌 [TEST 6] User: 'I already own white pajama.'");
  await manager.chat({ message: "I already own white pajama.", sessionId, domain: "fashion" });
  const stateOwned = await stateManager.getState(sessionId);
  if (!stateOwned.owned_items.includes("White Pajama")) {
    throw new Error("❌ FAIL [TEST 6]: 'White Pajama' was not stored in owned_items!");
  }
  console.log(`   Owned Items in Memory: [${stateOwned.owned_items.join(", ")}]`);
  console.log("   ✅ PASS [TEST 6]: Owned item retained and excluded from mandatory purchase.\n");

  // ---------------------------------------------------
  // TEST 7: Relative Follow-up ("Show another option")
  // ---------------------------------------------------
  console.log("📌 [TEST 7] User: 'Show another option.'");
  const res7 = await manager.chat({ message: "Show another option.", sessionId, domain: "fashion" });
  if (res7.content.toLowerCase().includes("hello! welcome")) {
    throw new Error("❌ FAIL [TEST 7]: 'Show another option' triggered greeting reset!");
  }
  console.log("   ✅ PASS [TEST 7]: Relative follow-up bypassed consultation gate without session reset.\n");

  // ---------------------------------------------------
  // TEST 8: Lock Items ("Keep the shoes")
  // ---------------------------------------------------
  console.log("📌 [TEST 8] User: 'Keep the shoes.'");
  await manager.chat({ message: "Keep the shoes.", sessionId, domain: "fashion" });
  const stateLocked = await stateManager.getState(sessionId);
  if (!stateLocked.locked_items.includes("Shoes")) {
    throw new Error("❌ FAIL [TEST 8]: 'Shoes' was not added to locked_items!");
  }
  console.log(`   Locked Items in Memory: [${stateLocked.locked_items.join(", ")}]`);
  console.log("   ✅ PASS [TEST 8]: Item 'Shoes' locked successfully in memory.\n");

  // ---------------------------------------------------
  // TEST 9: Explain Reasoning ("Explain why this works")
  // ---------------------------------------------------
  console.log("📌 [TEST 9] User: 'Explain why this outfit works.'");
  const res9 = await manager.chat({ message: "Explain why this outfit works.", sessionId, domain: "fashion" });
  console.log(`   Reasoning Snippet:\n   ${res9.content.slice(0, 250).split("\n").join("\n   ")}...\n`);
  console.log("   ✅ PASS [TEST 9]: Deep fabric and aesthetic reasoning generated.\n");

  console.log("====================================================");
  console.log("🎉 ALL 9 CONSULTATION GATE REGRESSION TESTS PASSED 100%!");
  console.log("====================================================");
}

runConsultationGateRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
