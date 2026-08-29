import { runOrchestratorTestSuite } from "./index";

async function main() {
  console.log("==================================================");
  console.log("RECOVERAI 185-POINT AUTOMATED VERIFICATION SUITE");
  console.log("==================================================\n");

  try {
    const result = await runOrchestratorTestSuite();

    console.log("--------------------------------------------------");
    result.tests.forEach((t) => {
      const mark = t.passed ? "✅" : "❌";
      console.log(`${mark} [${t.category}] Test #${t.testId}: ${t.name}`);
      console.log(`   Message: ${t.message}`);
    });
    console.log("--------------------------------------------------");
    console.log(`\nRESULTS: ${result.passed}/${result.total} TESTS PASSED in ${result.durationMs}ms`);

    if (result.failed > 0) {
      console.error(`\n❌ ${result.failed} TESTS FAILED.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 ALL ${result.passed}/${result.total} TESTS PASSED PERFECTLY!`);
      process.exit(0);
    }
  } catch (err: any) {
    console.error("Fatal error running test suite:", err);
    process.exit(1);
  }
}

main();
