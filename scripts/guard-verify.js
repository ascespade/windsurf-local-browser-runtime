#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REQUIRED_LOCKED_FILES = [
  'AGENTS.md',
  'docs/locked/OPERATING_CONTRACT.md',
  'docs/locked/HANDOFF_PROTOCOL.md',
  'docs/locked/ACCEPTANCE_GATES.json',
  'docs/locked/WORK_GRAPH.json'
];

const REQUIRED_TRUTH_FILES = [
  'docs/reports/CURRENT_TRUTH.md'
];

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
    
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
        return { exists: true, valid: true };
      } catch (e) {
        return { exists: true, valid: false, error: 'Invalid JSON' };
      }
    }
    
    return { exists: true, valid: true };
  } catch (e) {
    return { exists: true, valid: false, error: e.message };
  }
}

function validateWorkGraph() {
  const workGraphPath = 'docs/locked/WORK_GRAPH.json';
  const check = checkFile(workGraphPath);
  
  if (!check.exists) {
    return { valid: false, error: 'WORK_GRAPH.json missing' };
  }
  
  if (!check.valid) {
    return { valid: false, error: 'WORK_GRAPH.json invalid: ' + check.error };
  }
  
  try {
    const workGraph = JSON.parse(fs.readFileSync(workGraphPath, 'utf8'));
    
    if (!workGraph.work_graph || !workGraph.work_graph.nodes) {
      return { valid: false, error: 'WORK_GRAPH.json missing work_graph.nodes' };
    }
    
    if (!workGraph.work_graph.current_work) {
      return { valid: false, error: 'WORK_GRAPH.json missing current_work' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'WORK_GRAPH.json parse error: ' + e.message };
  }
}

function validateAcceptanceGates() {
  const gatesPath = 'docs/locked/ACCEPTANCE_GATES.json';
  const check = checkFile(gatesPath);
  
  if (!check.exists) {
    return { valid: false, error: 'ACCEPTANCE_GATES.json missing' };
  }
  
  if (!check.valid) {
    return { valid: false, error: 'ACCEPTANCE_GATES.json invalid: ' + check.error };
  }
  
  try {
    const gates = JSON.parse(fs.readFileSync(gatesPath, 'utf8'));
    
    if (!gates.gates || !gates.gates.governance) {
      return { valid: false, error: 'ACCEPTANCE_GATES.json missing governance gate' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'ACCEPTANCE_GATES.json parse error: ' + e.message };
  }
}

function main() {
  console.log('🔒 Guard Verification');
  console.log('');
  
  let allValid = true;
  
  console.log('Checking locked files...');
  for (const file of REQUIRED_LOCKED_FILES) {
    const check = checkFile(file);
    if (check.exists && check.valid) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file}: ${check.error}`);
      allValid = false;
    }
  }
  
  console.log('');
  console.log('Checking truth files...');
  for (const file of REQUIRED_TRUTH_FILES) {
    const check = checkFile(file);
    if (check.exists && check.valid) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file}: ${check.error}`);
      allValid = false;
    }
  }
  
  console.log('');
  console.log('Validating work graph...');
  const workGraphCheck = validateWorkGraph();
  if (workGraphCheck.valid) {
    console.log('✅ WORK_GRAPH.json structure valid');
  } else {
    console.log(`❌ WORK_GRAPH.json: ${workGraphCheck.error}`);
    allValid = false;
  }
  
  console.log('');
  console.log('Validating acceptance gates...');
  const gatesCheck = validateAcceptanceGates();
  if (gatesCheck.valid) {
    console.log('✅ ACCEPTANCE_GATES.json structure valid');
  } else {
    console.log(`❌ ACCEPTANCE_GATES.json: ${gatesCheck.error}`);
    allValid = false;
  }
  
  console.log('');
  if (allValid) {
    console.log('✅ All guard validations passed');
    process.exit(0);
  } else {
    console.log('❌ Guard validation failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
