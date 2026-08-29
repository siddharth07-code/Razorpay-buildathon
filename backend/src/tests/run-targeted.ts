import { runOrchestratorTestSuite } from "./index";

async function main() {
  console.log("==================================================");
  console.log("VIREON TARGETED REGRESSION SUITE: TESTS #186 - #195");
  console.log("==================================================\n");

  try {
    const result = await runOrchestratorTestSuite();
    const targeted = result.tests.filter((t) => t.testId >= 186 && t.testId <= 195);

    console.log("--------------------------------------------------");
    targeted.forEach((t) => {
      const mark = t.passed ? "✅" : "❌";
      console.log(`${mark} [${t.category}] Test #${t.testId}: ${t.name}`);
      console.log(`   Message: ${t.message}`);
    });
    console.log("--------------------------------------------------");

    const passedCount = targeted.filter((t) => t.passed).length;
    console.log(`\nTARGETED RESULTS: ${passedCount}/${targeted.length} TESTS PASSED`);

    if (passedCount === targeted.length) {
      console.log(`\n🎉 ALL ${passedCount}/${targeted.length} PHASE 16A REGRESSION TESTS PASSED!`);
      process.exit(0);
    } else {
      console.error(`\n❌ ${targeted.length - passedCount} TARGETED TESTS FAILED.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Fatal error running targeted suite:", err);
    process.exit(1);
  }
}

main();
