#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return { exists: false, error: 'File does not exist' };
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.trim().length === 0) {
      return { exists: true, valid: false, error: 'File is empty' };
    }
    return { exists: true, valid: true };
  } catch (e) {
    return { exists: true, valid: false, error: e.message };
  }
}

function getWorkGraph() {
  const workGraphPath = 'docs/locked/WORK_GRAPH.json';
  const check = checkFile(workGraphPath);
  
  if (!check.exists || !check.valid) {
    return { error: 'WORK_GRAPH.json not available' };
  }
  
  try {
    const workGraph = JSON.parse(fs.readFileSync(workGraphPath, 'utf8'));
    return workGraph;
  } catch (e) {
    return { error: 'WORK_GRAPH.json parse error: ' + e.message };
  }
}

function validateDependencies(workGraph, nodeId) {
  const node = workGraph.work_graph.nodes[nodeId];
  if (!node) {
    return { valid: false, error: `Node ${nodeId} not found` };
  }
  
  for (const depId of node.dependencies || []) {
    const depNode = workGraph.work_graph.nodes[depId];
    if (!depNode) {
      return { valid: false, error: `Dependency ${depId} not found` };
    }
    
    if (depNode.status !== 'completed') {
      return { valid: false, error: `Dependency ${depId} not completed` };
    }
  }
  
  return { valid: true };
}

function main() {
  console.log('➡️ Next Allowed Work');
  console.log('');
  
  const workGraphResult = getWorkGraph();
  if (workGraphResult.error) {
    console.log(`❌ Cannot determine next work: ${workGraphResult.error}`);
    process.exit(1);
  }
  
  const workGraph = workGraphResult;
  const currentWork = workGraph.work_graph?.current_work;
  const nextAllowed = workGraph.work_graph?.next_allowed || [];
  const blocked = workGraph.work_graph?.blocked || [];
  
  console.log(`🔄 Current Work: ${currentWork || 'none'}`);
  console.log('');
  
  if (nextAllowed.length === 0) {
    console.log('🚫 No work currently allowed');
    console.log('');
    console.log('Blocked items:');
    for (const blockedId of blocked) {
      const node = workGraph.work_graph.nodes[blockedId];
      if (node) {
        console.log(`  ❌ ${blockedId}: ${node.title}`);
      }
    }
    process.exit(1);
  }
  
  console.log('✅ Next allowed work:');
  for (const nextId of nextAllowed) {
    const node = workGraph.work_graph.nodes[nextId];
    if (node) {
      console.log(`  🎯 ${nextId}: ${node.title}`);
      console.log(`     Priority: ${node.priority}`);
      console.log(`     Agent: ${node.agent}`);
      console.log(`     Description: ${node.description}`);
      console.log('');
    }
  }
  
  console.log('🚫 Currently blocked:');
  for (const blockedId of blocked) {
    const node = workGraph.work_graph.nodes[blockedId];
    if (node) {
      console.log(`  ❌ ${blockedId}: ${node.title}`);
    }
  }
  
  console.log('');
  console.log('💡 To proceed with allowed work:');
  console.log('1. Choose one of the next allowed items above');
  console.log('2. Update WORK_GRAPH.json current_work to your choice');
  console.log('3. Run pnpm guard:verify to validate');
  console.log('4. Begin implementation');
}

if (require.main === module) {
  main();
}
