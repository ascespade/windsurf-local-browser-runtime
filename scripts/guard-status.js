#!/usr/bin/env node

const {
  REQUIRED_LOCKED_FILES,
  checkFile,
  computeNextAllowed,
  detectTestStatus,
  getCurrentTruthValidationTable,
  parseJson,
} = require('./guard-lib.js');

function main() {
  console.log('🔍 Repository Guard Status');
  console.log('');
  console.log('Locked Files Status:');

  let allLockedPresent = true;
  for (const file of REQUIRED_LOCKED_FILES) {
    const check = checkFile(file);
    if (check.exists && check.valid) console.log(`  ✅ ${file}`);
    else {
      console.log(`  ❌ ${file}: ${check.error}`);
      allLockedPresent = false;
    }
  }

  console.log('');
  console.log('Current Truth Status:');
  console.log(getCurrentTruthValidationTable());

  console.log('');
  console.log('Test Infrastructure Status:');
  const tests = detectTestStatus();
  console.log(`  Behavioral surfaces: ${tests.behavioral}`);
  console.log(`  Structural-only surfaces: ${tests.structural}`);
  console.log(`  Weak surfaces: ${tests.weak}`);
  console.log(`  Empty surfaces: ${tests.empty}`);
  console.log('');

  for (const detail of tests.details) {
    const icon = detail.status === 'BEHAVIORAL' ? '✅' : detail.status === 'STRUCTURAL' ? '⚠️ ' : detail.status === 'WEAK' ? '❌' : '❌';
    const classes = detail.classifications.map((item) => `${item.classification}:${item.tests}/${item.assertions}`).join(', ');
    console.log(`  ${icon} ${detail.name}: ${detail.status} (${detail.testFileCount} file(s))`);
    if (classes) console.log(`     ${classes}`);
  }

  console.log('');
  console.log('Work Graph Status:');
  const graph = parseJson('docs/locked/WORK_GRAPH.json');
  const computed = computeNextAllowed(graph);
  console.log(`  🔄 Current Work: ${graph.work_graph.current_work || 'none'}`);
  console.log(`  ➡️ Computed Next Allowed: ${computed.join(', ') || 'none'}`);
  console.log(`  🚫 Blocked: ${(graph.work_graph.blocked || []).join(', ') || 'none'}`);

  console.log('');
  if (allLockedPresent && tests.weak === 0 && tests.empty === 0) {
    console.log('✅ Governance system operational with non-empty test coverage');
  } else if (allLockedPresent) {
    console.log('⚠️ Governance files present but quality/test gaps remain');
  } else {
    console.log('❌ Governance system incomplete');
  }
}

if (require.main === module) {
  main();
}
