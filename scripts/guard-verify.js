#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REQUIRED_LOCKED_FILES = [
  'AGENTS.md',
  'docs/locked/OPERATING_CONTRACT.md',
  'docs/locked/HANDOFF_PROTOCOL.md',
  'docs/locked/ACCEPTANCE_GATES.json',
  'docs/locked/WORK_GRAPH.json',
];

const REQUIRED_TRUTH_FILES = ['docs/reports/CURRENT_TRUTH.md'];

const REQUIRED_APPS = [
  'browser-mcp',
  'remote-runtime',
  'orchestrator',
  'ui-extension',
];
const REQUIRED_PACKAGES = [
  'protocol',
  'shared-types',
  'retry-policy',
  'selector-engine',
  'session-store',
  'target-resolver',
  'url-bridge',
  'action-engine',
  'audit-core',
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
      return {
        valid: false,
        error: 'WORK_GRAPH.json missing work_graph.nodes',
      };
    }

    if (!workGraph.work_graph.current_work) {
      return { valid: false, error: 'WORK_GRAPH.json missing current_work' };
    }

    const nodes = workGraph.work_graph.nodes;
    for (const [nodeId, node] of Object.entries(nodes)) {
      if (!node.id || !node.title || !node.description) {
        return {
          valid: false,
          error: `Node ${nodeId} missing required fields (id, title, description)`,
        };
      }
      if (node.dependencies) {
        for (const dep of node.dependencies) {
          if (!nodes[dep]) {
            return {
              valid: false,
              error: `Node ${nodeId} has unknown dependency: ${dep}`,
            };
          }
        }
      }
    }

    const currentWork = workGraph.work_graph.current_work;
    const blocked = new Set(workGraph.work_graph.blocked || []);

    if (Array.isArray(workGraph.work_graph.next_allowed)) {
      for (const nextId of workGraph.work_graph.next_allowed) {
        if (!nodes[nextId]) {
          return {
            valid: false,
            error: `next_allowed references unknown node: ${nextId}`,
          };
        }
        const node = nodes[nextId];
        for (const dep of node.dependencies || []) {
          const depNode = nodes[dep];
          if (!depNode) continue;
          if (depNode.status === 'completed') continue;
          if (blocked.has(dep)) {
            return {
              valid: false,
              error: `next_allowed node ${nextId} depends on blocked node: ${dep}`,
            };
          }
          if (dep === currentWork) {
            return {
              valid: false,
              error: `next_allowed node ${nextId} depends on current_work: ${dep} (current_work must be advanced first)`,
            };
          }
        }
      }
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
    return {
      valid: false,
      error: 'ACCEPTANCE_GATES.json invalid: ' + check.error,
    };
  }

  try {
    const gates = JSON.parse(fs.readFileSync(gatesPath, 'utf8'));

    if (!gates.gates || !gates.gates.governance) {
      return {
        valid: false,
        error: 'ACCEPTANCE_GATES.json missing governance gate',
      };
    }

    const requiredGateKeys = ['governance', 'build', 'architecture', 'truth'];
    for (const key of requiredGateKeys) {
      if (!gates.gates[key]) {
        return {
          valid: false,
          error: `ACCEPTANCE_GATES.json missing required gate: ${key}`,
        };
      }
    }

    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: 'ACCEPTANCE_GATES.json parse error: ' + e.message,
    };
  }
}

function validateArchitecture() {
  const errors = [];

  for (const app of REQUIRED_APPS) {
    const appDir = path.join('apps', app);
    if (!fs.existsSync(appDir)) {
      errors.push(`Missing required app: apps/${app}`);
      continue;
    }
    const pkgPath = path.join(appDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      errors.push(`apps/${app} missing package.json`);
    }
    const srcDir = path.join(appDir, 'src');
    if (!fs.existsSync(srcDir)) {
      errors.push(`apps/${app} missing src/ directory`);
    } else {
      const srcFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.ts'));
      if (srcFiles.length === 0) {
        errors.push(`apps/${app}/src/ has no TypeScript files`);
      }
    }
  }

  for (const pkg of REQUIRED_PACKAGES) {
    const pkgDir = path.join('packages', pkg);
    if (!fs.existsSync(pkgDir)) {
      errors.push(`Missing required package: packages/${pkg}`);
      continue;
    }
    const pkgPath = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      errors.push(`packages/${pkg} missing package.json`);
    }
    const srcDir = path.join(pkgDir, 'src');
    if (!fs.existsSync(srcDir)) {
      errors.push(`packages/${pkg} missing src/ directory`);
    } else {
      const srcFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.ts'));
      if (srcFiles.length === 0) {
        errors.push(`packages/${pkg}/src/ has no TypeScript files`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}

function validateTestInfrastructure() {
  const warnings = [];
  const errors = [];
  const allPackages = [
    ...REQUIRED_APPS.map((a) => ({ name: a, dir: path.join('apps', a) })),
    ...REQUIRED_PACKAGES.map((p) => ({
      name: p,
      dir: path.join('packages', p),
    })),
  ];

  for (const { name, dir } of allPackages) {
    const pkgJsonPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const testScript = pkgJson.scripts?.test;

    if (!testScript) {
      warnings.push(`${name}: no test script defined`);
      continue;
    }

    let hasTestFiles = false;

    const srcTestsDir = path.join(dir, 'src', 'tests');
    if (fs.existsSync(srcTestsDir)) {
      const testFiles = fs
        .readdirSync(srcTestsDir)
        .filter((f) => f.endsWith('.test.ts') || f.endsWith('.spec.ts'));
      if (testFiles.length > 0) hasTestFiles = true;
    }

    const testsDir = path.join(dir, 'tests');
    if (fs.existsSync(testsDir)) {
      const testFiles = fs
        .readdirSync(testsDir)
        .filter((f) => f.endsWith('.test.ts') || f.endsWith('.spec.ts'));
      if (testFiles.length > 0) hasTestFiles = true;
    }

    const distTestsDir = path.join(dir, 'dist', 'tests');
    if (fs.existsSync(distTestsDir)) {
      const testFiles = fs
        .readdirSync(distTestsDir)
        .filter((f) => f.endsWith('.test.js') || f.endsWith('.spec.js'));
      if (testFiles.length > 0) hasTestFiles = true;
    }

    if (!hasTestFiles) {
      if (testScript.includes('echo')) {
        warnings.push(`${name}: test script is a stub (echo), no real tests`);
      } else if (
        testScript.includes('node --test') &&
        !testScript.includes('dist/')
      ) {
        errors.push(
          `${name}: test script 'node --test' with no test files produces fake 0/0 pass`,
        );
      } else if (
        testScript.includes('node --test --experimental-strip-types')
      ) {
        errors.push(
          `${name}: test script with --experimental-strip-types but no test files produces fake 0/0 pass`,
        );
      } else {
        warnings.push(
          `${name}: no test files found (test script: ${testScript})`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  return { valid: true, warnings };
}

function main() {
  console.log('🔒 Guard Verification');
  console.log('');

  let allValid = true;

  console.log('Checking locked files...');
  for (const file of REQUIRED_LOCKED_FILES) {
    const check = checkFile(file);
    if (check.exists && check.valid) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file}: ${check.error}`);
      allValid = false;
    }
  }

  console.log('');
  console.log('Checking truth files...');
  for (const file of REQUIRED_TRUTH_FILES) {
    const check = checkFile(file);
    if (check.exists && check.valid) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file}: ${check.error}`);
      allValid = false;
    }
  }

  console.log('');
  console.log('Validating work graph...');
  const workGraphCheck = validateWorkGraph();
  if (workGraphCheck.valid) {
    console.log('  ✅ WORK_GRAPH.json structure valid');
  } else {
    console.log(`  ❌ WORK_GRAPH.json: ${workGraphCheck.error}`);
    allValid = false;
  }

  console.log('');
  console.log('Validating acceptance gates...');
  const gatesCheck = validateAcceptanceGates();
  if (gatesCheck.valid) {
    console.log('  ✅ ACCEPTANCE_GATES.json structure valid');
  } else {
    console.log(`  ❌ ACCEPTANCE_GATES.json: ${gatesCheck.error}`);
    allValid = false;
  }

  console.log('');
  console.log('Validating architecture...');
  const archCheck = validateArchitecture();
  if (archCheck.valid) {
    console.log('  ✅ All required apps and packages present');
  } else {
    for (const err of archCheck.errors) {
      console.log(`  ❌ ${err}`);
    }
    allValid = false;
  }

  console.log('');
  console.log('Validating test infrastructure...');
  const testCheck = validateTestInfrastructure();
  if (testCheck.warnings && testCheck.warnings.length > 0) {
    for (const warn of testCheck.warnings) {
      console.log(`  ⚠️  ${warn}`);
    }
  }
  if (!testCheck.valid) {
    for (const err of testCheck.errors) {
      console.log(`  ❌ ${err}`);
    }
    allValid = false;
  } else {
    console.log('  ✅ Test infrastructure valid');
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
