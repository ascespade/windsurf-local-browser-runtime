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

function getWorkGraphStatus() {
  const workGraphPath = 'docs/locked/WORK_GRAPH.json';
  const check = checkFile(workGraphPath);
  
  if (!check.exists || !check.valid) {
    return { error: 'WORK_GRAPH.json not available' };
  }
  
  try {
    const workGraph = JSON.parse(fs.readFileSync(workGraphPath, 'utf8'));
    return {
      current_work: workGraph.work_graph?.current_work,
      next_allowed: workGraph.work_graph?.next_allowed || [],
      blocked: workGraph.work_graph?.blocked || []
    };
  } catch (e) {
    return { error: 'WORK_GRAPH.json parse error' };
  }
}

function getCurrentTruth() {
  const truthPath = 'docs/reports/CURRENT_TRUTH.md';
  const check = checkFile(truthPath);
  
  if (!check.exists) {
    return 'CURRENT_TRUTH.md missing';
  }
  
  try {
    const content = fs.readFileSync(truthPath, 'utf8');
    const lines = content.split('\n');
    const validationSection = lines.findIndex(line => line.includes('### Validation Status'));
    
    if (validationSection >= 0) {
      const tableLines = [];
      for (let i = validationSection + 1; i < lines.length; i++) {
        if (lines[i].startsWith('|')) {
          tableLines.push(lines[i]);
        } else if (lines[i].trim() === '' && tableLines.length > 0) {
          break;
        }
      }
      return tableLines.join('\n');
    }
    
    return 'CURRENT_TRUTH.md validation section not found';
  } catch (e) {
    return 'CURRENT_TRUTH.md read error: ' + e.message;
  }
}

function main() {
  console.log('🔍 Repository Guard Status');
  console.log('');
  
  const lockedFiles = [
    'AGENTS.md',
    'docs/locked/OPERATING_CONTRACT.md', 
    'docs/locked/HANDOFF_PROTOCOL.md',
    'docs/locked/ACCEPTANCE_GATES.json',
    'docs/locked/WORK_GRAPH.json'
  ];
  
  console.log('Locked Files Status:');
  let allLockedPresent = true;
  for (const file of lockedFiles) {
    const check = checkFile(file);
    if (check.exists && check.valid) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file}: ${check.error}`);
      allLockedPresent = false;
    }
  }
  
  console.log('');
  console.log('Current Truth Status:');
  const truth = getCurrentTruth();
  console.log(truth);
  
  console.log('');
  console.log('Work Graph Status:');
  const workStatus = getWorkGraphStatus();
  if (workStatus.error) {
    console.log(`❌ ${workStatus.error}`);
  } else {
    console.log(`🔄 Current Work: ${workStatus.current_work}`);
    console.log(`➡️ Next Allowed: ${workStatus.next_allowed.join(', ') || 'none'}`);
    console.log(`🚫 Blocked: ${workStatus.blocked.join(', ') || 'none'}`);
  }
  
  console.log('');
  if (allLockedPresent) {
    console.log('✅ Governance system operational');
  } else {
    console.log('❌ Governance system incomplete');
  }
}

if (require.main === module) {
  main();
}
