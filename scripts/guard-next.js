#!/usr/bin/env node

const { computeNextAllowed, parseJson, validateWorkGraph } = require('./guard-lib.js');

function main() {
  const workGraphResult = validateWorkGraph();
  if (!workGraphResult.valid) {
    console.error(`❌ Cannot determine next work: ${workGraphResult.error}`);
    process.exit(1);
  }

  const graph = parseJson('docs/locked/WORK_GRAPH.json');
  const nextAllowed = computeNextAllowed(graph);
  const blocked = graph.work_graph.blocked || [];
  console.log('➡️ Next Allowed Work');
  console.log('');
  console.log(`🔄 Current Work: ${graph.work_graph.current_work || 'none'}`);
  console.log('');

  if (nextAllowed.length === 0) {
    console.log('🚫 No work currently allowed');
    if (blocked.length > 0) {
      console.log('');
      console.log('Blocked items:');
      for (const blockedId of blocked) {
        const node = graph.work_graph.nodes[blockedId];
        if (node) console.log(`  ❌ ${blockedId}: ${node.title}`);
      }
    }
    process.exit(1);
  }

  console.log('✅ Computed next allowed work:');
  for (const nextId of nextAllowed) {
    const node = graph.work_graph.nodes[nextId];
    console.log(`  🎯 ${nextId}: ${node.title}`);
    console.log(`     Priority: ${node.priority}`);
    console.log(`     Agent: ${node.agent}`);
    console.log(`     Description: ${node.description}`);
    console.log('');
  }

  if (blocked.length > 0) {
    console.log('🚫 Currently blocked:');
    for (const blockedId of blocked) {
      const node = graph.work_graph.nodes[blockedId];
      if (node) console.log(`  ❌ ${blockedId}: ${node.title}`);
    }
    console.log('');
  }

  console.log('💡 To proceed: update current_work to one computed next node, implement it, then mark it completed only after validation.');
}

if (require.main === module) {
  main();
}
