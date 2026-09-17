import { getConversationManager } from "../server/ai/conversation/conversation-manager.ts";
import { getStylistStateManager } from "../server/ai/memory/stylist-state-manager.ts";
import { writeFileSync } from "fs";

interface TestResult {
  scenarioName: string;
  turns: Array<{ user: string; assistant: string }>;
  passed: boolean;
  score: number;
  checks: Record<string, boolean>;
}

async function runPhase6Verification() {
  console.log("🚀 Starting Phase 6 Comprehensive Conversation Quality Verification...\n");

  const manager = getConversationManager();
  const stateManager = getStylistStateManager();
  const testResults: TestResult[] = [];

  // ==========================================
  // SCENARIO 1: Holud Guest Multi-Turn Test
  // ==========================================
  console.log("🔹 Running Test Scenario 1: Holud Guest + Context Persistence + Relative Modifiers...");
  const s1 = `phase6-s1-${Date.now()}`;
  const s1Turns = [
    "Hi",
    "I'm attending my cousin's Holud.",
    "I'm a guest.",
    "Evening event.",
    "Traditional only.",
    "I don't like yellow.",
    "I already own white pajama.",
    "I prefer navy.",
    "Show another option.",
    "Keep the same shoes.",
    "Change only the Panjabi.",
    "Explain why this outfit works."
  ];

  const s1Outputs: Array<{ user: string; assistant: string }> = [];
  for (const turn of s1Turns) {
    const res = await manager.chat({ message: turn, sessionId: s1, domain: "fashion" });
    s1Outputs.push({ user: turn, assistant: res.content });
  }

  const s1State = await stateManager.getState(s1);
  const s1Checks = {
    "Occasion Extracted (Holud)": s1State.occasion === "Holud",
    "Style Extracted (Traditional)": s1State.style === "Traditional",
    "Negation Preserved (Yellow Avoided)": s1State.avoid_colors.includes("Yellow"),
    "Wardrobe Preserved (White Pajama Owned)": s1State.owned_items.includes("White Pajama"),
    "Color Preference Preserved (Navy)": s1State.preferred_colors.includes("Navy"),
    "No Welcome Reset on 'Show another option'": !s1Outputs[8].assistant.toLowerCase().includes("welcome"),
    "Locked Shoes Registered": s1State.locked_items.includes("Shoes"),
  };

  const s1Score = Object.values(s1Checks).filter(Boolean).length / Object.keys(s1Checks).length;
  testResults.push({
    scenarioName: "Scenario 1: Holud Guest Multi-Turn & Relative Modifiers",
    turns: s1Outputs,
    passed: s1Score >= 0.85,
    score: s1Score * 10,
    checks: s1Checks,
  });

  // ==========================================
  // SCENARIO 2: Office & Material Constraints
  // ==========================================
  console.log("\n🔹 Running Test Scenario 2: Office Business Casual & Material Constraints...");
  const s2 = `phase6-s2-${Date.now()}`;
  const s2Turns = [
    "I need office clothes.",
    "Business casual.",
    "I already own black chinos.",
    "I don't wear leather shoes.",
    "Show another color.",
    "Make it suitable for Dhaka summer."
  ];

  const s2Outputs: Array<{ user: string; assistant: string }> = [];
  for (const turn of s2Turns) {
    const res = await manager.chat({ message: turn, sessionId: s2, domain: "fashion" });
    s2Outputs.push({ user: turn, assistant: res.content });
  }

  const s2State = await stateManager.getState(s2);
  const s2Checks = {
    "Occasion Extracted (Office)": s2State.occasion === "Office / Corporate",
    "Style Extracted (Business Casual)": s2State.style === "Business Casual",
    "Wardrobe Preserved (Black Chinos Owned)": s2State.owned_items.includes("Black Chinos"),
    "No Session Reset on 'Show another color'": !s2Outputs[4].assistant.toLowerCase().includes("welcome"),
  };

  const s2Score = Object.values(s2Checks).filter(Boolean).length / Object.keys(s2Checks).length;
  testResults.push({
    scenarioName: "Scenario 2: Office & Material Constraints",
    turns: s2Outputs,
    passed: s2Score >= 0.85,
    score: s2Score * 10,
    checks: s2Checks,
  });

  // ==========================================
  // SCENARIO 3: Pohela Boishakh Cultural Accuracy
  // ==========================================
  console.log("\n🔹 Running Test Scenario 3: Pohela Boishakh Cultural Defaults...");
  const s3 = `phase6-s3-${Date.now()}`;
  const s3Turns = [
    "I'm going to Pohela Boishakh.",
    "I don't like red.",
    "Show three modern looks.",
    "Explain the cultural meaning."
  ];

  const s3Outputs: Array<{ user: string; assistant: string }> = [];
  for (const turn of s3Turns) {
    const res = await manager.chat({ message: turn, sessionId: s3, domain: "fashion" });
    s3Outputs.push({ user: turn, assistant: res.content });
  }

  const s3State = await stateManager.getState(s3);
  const s3Checks = {
    "Occasion Extracted (Pohela Boishakh)": s3State.occasion === "Pohela Boishakh",
    "Negation Preserved (Red Avoided)": s3State.avoid_colors.includes("Red"),
    "No Automatic Navy Default (Culturally Respectful)": !s3Outputs[2].assistant.toLowerCase().includes("navy panjabi"),
  };

  const s3Score = Object.values(s3Checks).filter(Boolean).length / Object.keys(s3Checks).length;
  testResults.push({
    scenarioName: "Scenario 3: Pohela Boishakh Cultural Defaults",
    turns: s3Outputs,
    passed: s3Score >= 0.85,
    score: s3Score * 10,
    checks: s3Checks,
  });

  // ==========================================
  // SCENARIO 4: Groom Luxury Wedding
  // ==========================================
  console.log("\n🔹 Running Test Scenario 4: Groom Luxury Wedding & Photography Reasoning...");
  const s4 = `phase6-s4-${Date.now()}`;
  const s4Turns = [
    "I'm getting married.",
    "I'm the groom.",
    "Evening reception.",
    "Luxury traditional.",
    "Family prefers gold.",
    "No black.",
    "Which photographs best?"
  ];

  const s4Outputs: Array<{ user: string; assistant: string }> = [];
  for (const turn of s4Turns) {
    const res = await manager.chat({ message: turn, sessionId: s4, domain: "fashion" });
    s4Outputs.push({ user: turn, assistant: res.content });
  }

  const s4State = await stateManager.getState(s4);
  const s4Checks = {
    "Occasion Extracted (Wedding Reception)": s4State.occasion === "Wedding Reception",
    "Role Detail Extracted (Groom)": s4State.event_details?.includes("Groom") ?? false,
    "Color Preference Preserved (Gold)": s4State.preferred_colors.includes("Gold"),
    "Negation Preserved (Black Avoided)": s4State.avoid_colors.includes("Black"),
  };

  const s4Score = Object.values(s4Checks).filter(Boolean).length / Object.keys(s4Checks).length;
  testResults.push({
    scenarioName: "Scenario 4: Groom Luxury Wedding & Photography Reasoning",
    turns: s4Outputs,
    passed: s4Score >= 0.85,
    score: s4Score * 10,
    checks: s4Checks,
  });

  // ==========================================
  // SCENARIO 5: Wardrobe Integration ("I have...")
  // ==========================================
  console.log("\n🔹 Running Test Scenario 5: Multi-Item Wardrobe Integration...");
  const s5 = `phase6-s5-${Date.now()}`;
  const s5Turns = [
    "I have white sneakers, black jeans, and navy blazer.",
    "Build three outfits.",
    "Explain why."
  ];

  const s5Outputs: Array<{ user: string; assistant: string }> = [];
  for (const turn of s5Turns) {
    const res = await manager.chat({ message: turn, sessionId: s5, domain: "fashion" });
    s5Outputs.push({ user: turn, assistant: res.content });
  }

  const s5State = await stateManager.getState(s5);
  const s5Checks = {
    "Owned Sneakers Registered": s5State.owned_items.includes("White Sneakers"),
    "Owned Jeans Registered": s5State.owned_items.includes("Black Jeans"),
    "Owned Blazer Registered": s5State.owned_items.includes("Navy Blazer"),
    "Explains Wardrobe Combination": s5Outputs[2].assistant.length > 50,
  };

  const s5Score = Object.values(s5Checks).filter(Boolean).length / Object.keys(s5Checks).length;
  testResults.push({
    scenarioName: "Scenario 5: Multi-Item Wardrobe Integration",
    turns: s5Outputs,
    passed: s5Score >= 0.85,
    score: s5Score * 10,
    checks: s5Checks,
  });

  // Summary Report Generation
  console.log("\n=======================================================");
  console.log("📊 PHASE 6 AUTOMATED EVALUATION VERIFICATION SUMMARY");
  console.log("=======================================================");

  let overallScoreSum = 0;
  for (const tr of testResults) {
    console.log(`\n📌 ${tr.scenarioName}: ${tr.passed ? "✅ PASS" : "❌ FAIL"} (${tr.score.toFixed(1)}/10)`);
    for (const [checkName, checkVal] of Object.entries(tr.checks)) {
      console.log(`   - ${checkName}: ${checkVal ? "✅" : "❌"}`);
    }
    overallScoreSum += tr.score;
  }

  const finalAvgScore = overallScoreSum / testResults.length;
  console.log(`\n🏆 OVERALL PHASE 6 CHATBOT QUALITY SCORE: ${finalAvgScore.toFixed(2)} / 10`);

  // Write JSON report
  const reportObj = {
    timestamp: new Date().toISOString(),
    overallScore: Number(finalAvgScore.toFixed(2)),
    scenarios: testResults,
  };

  writeFileSync("db/eval_reports/phase6_verification_report.json", JSON.stringify(reportObj, null, 2));
  console.log("\n📁 Generated report: db/eval_reports/phase6_verification_report.json");
}

runPhase6Verification().catch(console.error);
