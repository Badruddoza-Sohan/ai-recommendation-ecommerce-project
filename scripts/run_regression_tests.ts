import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.join(__dirname, "..", "db", "eval_reports", "eval_report.json");

// Predefined Build Thresholds
const THRESHOLDS = {
  overall_quality_score: 90.0,
  pass_rate: 95.0,
  avg_product_grounding: 95.0,
  avg_constraint_retention: 90.0,
  avg_cultural_accuracy: 90.0,
};

async function runRegressionCheck() {
  console.log("🚦 Running Automated Pre-Deployment Regression Test Suite...");

  let reportRaw: string;
  try {
    reportRaw = await fs.readFile(REPORT_PATH, "utf-8");
  } catch (err) {
    console.error(`❌ Regression Error: Evaluation report not found at ${REPORT_PATH}. Run 'npx tsx scripts/evaluate_stylist_performance.ts' first!`);
    process.exit(1);
  }

  const data = JSON.parse(reportRaw);
  const summary = data.summary;

  console.log("\n📊 Evaluating Thresholds:");

  let passedAll = true;

  function checkMetric(name: keyof typeof THRESHOLDS, actualStr: string, minRequired: number) {
    const actualNum = parseFloat(actualStr.replace("%", ""));
    const passed = actualNum >= minRequired;
    console.log(` - ${name}: Actual = ${actualNum}% | Required >= ${minRequired}% ➔ ${passed ? "✅ PASS" : "❌ FAIL"}`);
    if (!passed) passedAll = false;
  }

  checkMetric("overall_quality_score", summary.overall_quality_score, THRESHOLDS.overall_quality_score);
  checkMetric("pass_rate", summary.pass_rate, THRESHOLDS.pass_rate);
  checkMetric("avg_product_grounding", summary.avg_product_grounding, THRESHOLDS.avg_product_grounding);
  checkMetric("avg_constraint_retention", summary.avg_constraint_retention, THRESHOLDS.avg_constraint_retention);
  checkMetric("avg_cultural_accuracy", summary.avg_cultural_accuracy, THRESHOLDS.avg_cultural_accuracy);

  if (passedAll) {
    console.log("\n🎉 REGRESSION SUITE PASSED! Production Build Approved.");
    process.exit(0);
  } else {
    console.error("\n❌ REGRESSION SUITE FAILED! Quality metrics below minimum production threshold.");
    process.exit(1);
  }
}

runRegressionCheck();
