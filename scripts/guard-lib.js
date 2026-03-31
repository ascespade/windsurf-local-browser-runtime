const fs = require('fs');
const path = require('path');

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

function readText(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

function checkFile(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return { exists: false, valid: false, error: 'File does not exist' };
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.trim().length === 0) {
      return { exists: true, valid: false, error: 'File is empty' };
    }

    if (filePath.endsWith('.json')) {
      JSON.parse(content);
    }

    return { exists: true, valid: true, content };
  } catch (error) {
    return {
      exists: true,
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseJson(filePath) {
  return JSON.parse(readText(filePath));
}

function listWorkspaceEntries(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root)
    .filter((entry) => fs.statSync(path.join(root, entry)).isDirectory())
    .sort();
}

function collectTestFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectTestFiles(full));
      continue;
    }
    if (/\.(test|spec)\.ts$/.test(entry)) {
      files.push(full);
    }
  }
  return files.sort();
}

function detectTestQuality(filePath) {
  const content = readText(filePath);
  const assertions = (content.match(/\bassert\./g) || []).length;
  const tests = (content.match(/\btest\s*\(/g) || []).length;
  const importsDist = /\.\.\/dist\//.test(content);
  const hasPlaceholder = /TODO|placeholder|fixme/i.test(content);
  const hasBehaviorSignals = /rejects\(|throws\(|deepEqual\(|match\(|doesNotThrow\(|ok\(/.test(content);
  const classification =
    tests === 0
      ? 'invalid'
      : assertions === 0
        ? 'weak'
        : importsDist && !hasBehaviorSignals
          ? 'structural'
          : hasPlaceholder
            ? 'weak'
            : 'behavioral';

  return {
    filePath,
    tests,
    assertions,
    importsDist,
    hasPlaceholder,
    classification,
  };
}

function detectTestStatus() {
  const apps = listWorkspaceEntries('apps').map((name) => ({
    name,
    dir: path.join('apps', name),
    type: 'app',
  }));
  const packages = listWorkspaceEntries('packages').map((name) => ({
    name,
    dir: path.join('packages', name),
    type: 'package',
  }));

  const details = [];
  let behavioral = 0;
  let structural = 0;
  let weak = 0;
  let empty = 0;

  for (const entry of [...apps, ...packages]) {
    const testFiles = [
      ...collectTestFiles(path.join(entry.dir, 'tests')),
      ...collectTestFiles(path.join(entry.dir, 'src', 'tests')),
    ];
    const pkgPath = path.join(entry.dir, 'package.json');
    const pkg = fs.existsSync(pkgPath) ? parseJson(pkgPath) : {};
    const testScript = pkg.scripts?.test || '';

    if (testFiles.length === 0) {
      empty += 1;
      details.push({
        name: entry.name,
        type: entry.type,
        status: 'EMPTY',
        testFileCount: 0,
        testScript,
        classifications: [],
      });
      continue;
    }

    const analyses = testFiles.map(detectTestQuality);
    const hasWeak = analyses.some((item) => item.classification === 'weak' || item.classification === 'invalid');
    const hasBehavioral = analyses.some((item) => item.classification === 'behavioral');
    const status = hasWeak ? 'WEAK' : hasBehavioral ? 'BEHAVIORAL' : 'STRUCTURAL';

    if (status === 'WEAK') weak += 1;
    else if (status === 'BEHAVIORAL') behavioral += 1;
    else structural += 1;

    details.push({
      name: entry.name,
      type: entry.type,
      status,
      testFileCount: testFiles.length,
      testScript,
      classifications: analyses,
    });
  }

  return {
    behavioral,
    structural,
    weak,
    empty,
    details,
  };
}

function validateAcceptanceGates() {
  const gatesPath = 'docs/locked/ACCEPTANCE_GATES.json';
  const check = checkFile(gatesPath);
  if (!check.exists || !check.valid) {
    return { valid: false, error: check.error || 'Invalid acceptance gates file' };
  }

  const gates = JSON.parse(check.content);
  const requiredGateKeys = ['governance', 'build', 'architecture', 'truth'];
  for (const key of requiredGateKeys) {
    if (!gates.gates?.[key]) {
      return { valid: false, error: `Missing required gate: ${key}` };
    }
  }

  if (!gates.dependencies || !gates.validation_levels) {
    return { valid: false, error: 'Acceptance gates missing dependencies or validation_levels' };
  }

  return { valid: true, gates };
}

function validateArchitecture() {
  const errors = [];

  for (const app of REQUIRED_APPS) {
    const appDir = path.join('apps', app);
    if (!fs.existsSync(appDir)) {
      errors.push(`Missing required app: ${appDir}`);
      continue;
    }
    if (!fs.existsSync(path.join(appDir, 'package.json'))) {
      errors.push(`${appDir} missing package.json`);
    }
    if (!fs.existsSync(path.join(appDir, 'src', 'index.ts'))) {
      errors.push(`${appDir} missing src/index.ts`);
    }
  }

  for (const pkg of REQUIRED_PACKAGES) {
    const pkgDir = path.join('packages', pkg);
    if (!fs.existsSync(pkgDir)) {
      errors.push(`Missing required package: ${pkgDir}`);
      continue;
    }
    if (!fs.existsSync(path.join(pkgDir, 'package.json'))) {
      errors.push(`${pkgDir} missing package.json`);
    }
    if (!fs.existsSync(path.join(pkgDir, 'src', 'index.ts'))) {
      errors.push(`${pkgDir} missing src/index.ts`);
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, error: errors.join('; ') };
}

function detectCircularDependencies() {
  const packageMap = new Map();
  const entries = [
    ...listWorkspaceEntries('apps').map((name) => path.join('apps', name)),
    ...listWorkspaceEntries('packages').map((name) => path.join('packages', name)),
  ];

  for (const dir of entries) {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = parseJson(pkgPath);
    const deps = new Set();
    for (const [depName, depValue] of Object.entries(pkg.dependencies || {})) {
      if (typeof depName === 'string' && typeof depValue === 'string' && depValue.startsWith('workspace:')) {
        deps.add(depName);
      }
    }
    packageMap.set(pkg.name, [...deps]);
  }

  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(name) {
    if (visiting.has(name)) {
      const cycleStart = stack.indexOf(name);
      return stack.slice(cycleStart).concat(name);
    }
    if (visited.has(name)) return null;
    visiting.add(name);
    stack.push(name);
    for (const dep of packageMap.get(name) || []) {
      const cycle = visit(dep);
      if (cycle) return cycle;
    }
    visiting.delete(name);
    visited.add(name);
    stack.pop();
    return null;
  }

  for (const name of packageMap.keys()) {
    const cycle = visit(name);
    if (cycle) {
      return { valid: false, error: `Circular dependency detected: ${cycle.join(' -> ')}` };
    }
  }
  return { valid: true };
}

function validateWorkGraph() {
  const check = checkFile('docs/locked/WORK_GRAPH.json');
  if (!check.exists || !check.valid) {
    return { valid: false, error: check.error || 'Invalid WORK_GRAPH.json' };
  }

  const graph = JSON.parse(check.content);
  const workGraph = graph.work_graph;
  if (!workGraph?.nodes || typeof workGraph.nodes !== 'object') {
    return { valid: false, error: 'WORK_GRAPH.json missing work_graph.nodes' };
  }

  const nodeIds = Object.keys(workGraph.nodes);
  const blocked = new Set(workGraph.blocked || []);
  for (const blockedId of blocked) {
    if (!workGraph.nodes[blockedId]) {
      return { valid: false, error: `Blocked node ${blockedId} does not exist` };
    }
  }

  for (const [id, node] of Object.entries(workGraph.nodes)) {
    if (!node.id || !node.title || !node.description) {
      return { valid: false, error: `Node ${id} missing required fields` };
    }
    if (!Array.isArray(node.dependencies)) {
      return { valid: false, error: `Node ${id} dependencies must be an array` };
    }
    for (const dep of node.dependencies) {
      if (!workGraph.nodes[dep]) {
        return { valid: false, error: `Node ${id} depends on unknown node ${dep}` };
      }
    }
  }

  const cycle = (() => {
    const visiting = new Set();
    const visited = new Set();
    const stack = [];
    function visit(id) {
      if (visiting.has(id)) {
        const start = stack.indexOf(id);
        return stack.slice(start).concat(id);
      }
      if (visited.has(id)) return null;
      visiting.add(id);
      stack.push(id);
      for (const dep of workGraph.nodes[id].dependencies || []) {
        const found = visit(dep);
        if (found) return found;
      }
      visiting.delete(id);
      visited.add(id);
      stack.pop();
      return null;
    }
    for (const id of nodeIds) {
      const found = visit(id);
      if (found) return found;
    }
    return null;
  })();

  if (cycle) {
    return { valid: false, error: `Work graph cycle detected: ${cycle.join(' -> ')}` };
  }

  const computedNext = computeNextAllowed(graph);
  const configuredNext = [...(workGraph.next_allowed || [])].sort();
  if (JSON.stringify(computedNext) !== JSON.stringify(configuredNext)) {
    return {
      valid: false,
      error: `next_allowed mismatch. computed=${computedNext.join(',') || 'none'} configured=${configuredNext.join(',') || 'none'}`,
    };
  }

  const currentWork = workGraph.current_work;
  if (currentWork && !workGraph.nodes[currentWork]) {
    return { valid: false, error: `current_work ${currentWork} does not exist` };
  }
  if (currentWork && workGraph.nodes[currentWork].status === 'completed') {
    return { valid: false, error: `current_work ${currentWork} cannot be completed` };
  }

  return { valid: true, graph, computedNext };
}

function computeNextAllowed(graph) {
  const workGraph = graph.work_graph;
  const nodes = workGraph.nodes;
  const blocked = new Set(workGraph.blocked || []);

  const currentWork = workGraph.current_work;

  return Object.keys(nodes)
    .filter((id) => {
      const node = nodes[id];
      const status = node.status || 'pending';
      if (id === currentWork) {
        return false;
      }
      if (status === 'completed' || status === 'in_progress') {
        return false;
      }
      if (blocked.has(id)) {
        return false;
      }
      return (node.dependencies || []).every((depId) => nodes[depId]?.status === 'completed');
    })
    .sort((a, b) => {
      const aNode = nodes[a];
      const bNode = nodes[b];
      const priorityDelta = (aNode.priority ?? 999) - (bNode.priority ?? 999);
      return priorityDelta !== 0 ? priorityDelta : a.localeCompare(b);
    });
}

function getCurrentTruthValidationTable() {
  const check = checkFile('docs/reports/CURRENT_TRUTH.md');
  if (!check.exists || !check.valid) {
    return 'CURRENT_TRUTH.md missing or invalid';
  }
  const lines = check.content.split('\n');
  const index = lines.findIndex((line) => line.includes('### Validation Status'));
  if (index < 0) return 'CURRENT_TRUTH.md validation section not found';
  const tableLines = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('|')) tableLines.push(lines[i]);
    else if (tableLines.length > 0) break;
  }
  return tableLines.join('\n');
}

module.exports = {
  REQUIRED_APPS,
  REQUIRED_LOCKED_FILES,
  REQUIRED_PACKAGES,
  REQUIRED_TRUTH_FILES,
  checkFile,
  computeNextAllowed,
  detectCircularDependencies,
  detectTestStatus,
  getCurrentTruthValidationTable,
  parseJson,
  validateAcceptanceGates,
  validateArchitecture,
  validateWorkGraph,
};
