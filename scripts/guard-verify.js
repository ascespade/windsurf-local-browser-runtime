#!/usr/bin/env node

const {
  REQUIRED_LOCKED_FILES,
  REQUIRED_TRUTH_FILES,
  checkFile,
  detectCircularDependencies,
  detectTestStatus,
  validateAcceptanceGates,
  validateArchitecture,
  validateWorkGraph,
} = require('./guard-lib.js');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function main() {
  for (const file of [...REQUIRED_LOCKED_FILES, ...REQUIRED_TRUTH_FILES]) {
    const check = checkFile(file);
    if (!check.exists || !check.valid) {
      fail(`${file}: ${check.error}`);
    }
  }

  const acceptance = validateAcceptanceGates();
  if (!acceptance.valid) fail(acceptance.error);

  const architecture = validateArchitecture();
  if (!architecture.valid) fail(architecture.error);

  const circular = detectCircularDependencies();
  if (!circular.valid) fail(circular.error);

  const workGraph = validateWorkGraph();
  if (!workGraph.valid) fail(workGraph.error);

  const tests = detectTestStatus();
  if (tests.empty > 0) {
    fail(`Empty test surfaces remain: ${tests.details.filter((item) => item.status === 'EMPTY').map((item) => item.name).join(', ')}`);
  }
  if (tests.weak > 0) {
    fail(`Weak test surfaces remain: ${tests.details.filter((item) => item.status === 'WEAK').map((item) => item.name).join(', ')}`);
  }

  console.log('✅ Guard verification passed');
  console.log(`   Behavioral test surfaces: ${tests.behavioral}`);
  console.log(`   Structural-only test surfaces: ${tests.structural}`);
  console.log(`   Next allowed: ${workGraph.computedNext.join(', ') || 'none'}`);
}

if (require.main === module) {
  main();
}
