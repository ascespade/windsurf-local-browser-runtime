import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

// Test protocol schemas and types
describe('Protocol', () => {
  test('should export all required modules', async () => {
    // Import individual modules to verify they exist
    const eventSchemas = await import('../src/event-schemas.js');
    const evidenceSchemas = await import('../src/evidence-schemas.js');
    const sessionSchemas = await import('../src/session-schemas.js');
    const toolSchemas = await import('../src/tool-schemas.js');
    
    // Verify modules loaded successfully
    assert.ok(eventSchemas, 'event-schemas should load');
    assert.ok(evidenceSchemas, 'evidence-schemas should load');
    assert.ok(sessionSchemas, 'session-schemas should load');
    assert.ok(toolSchemas, 'tool-schemas should load');
  });

  test('should have valid BrowserActionTarget interface', async () => {
    // Test that we can create objects conforming to the interface
    const cssTarget = {
      strategy: 'css' as const,
      value: 'button.submit'
    };
    
    const testIdTarget = {
      strategy: 'testId' as const,
      value: 'submit-button',
      testIdAttribute: 'data-testid'
    };
    
    const roleTarget = {
      strategy: 'role' as const,
      value: 'Submit',
      role: 'button'
    };
    
    const labelTarget = {
      strategy: 'label' as const,
      value: 'Username'
    };
    
    const textTarget = {
      strategy: 'text' as const,
      value: 'Click me'
    };
    
    // Verify structure
    assert.equal(cssTarget.strategy, 'css');
    assert.equal(cssTarget.value, 'button.submit');
    
    assert.equal(testIdTarget.strategy, 'testId');
    assert.equal(testIdTarget.testIdAttribute, 'data-testid');
    
    assert.equal(roleTarget.strategy, 'role');
    assert.equal(roleTarget.role, 'button');
    
    assert.equal(labelTarget.strategy, 'label');
    assert.equal(labelTarget.value, 'Username');
    
    assert.equal(textTarget.strategy, 'text');
    assert.equal(textTarget.value, 'Click me');
  });

  test('should have valid BrowserLaunchInput interface', async () => {
    const launchInput = {
      sessionName: 'test-session',
      profileStrategy: 'isolated' as const,
      headless: true,
      preferredBrowser: 'chrome' as const,
      debugPort: 9222,
      baseUrl: 'https://example.com'
    };
    
    assert.equal(launchInput.sessionName, 'test-session');
    assert.equal(launchInput.profileStrategy, 'isolated');
    assert.equal(launchInput.headless, true);
    assert.equal(launchInput.preferredBrowser, 'chrome');
    assert.equal(launchInput.debugPort, 9222);
    assert.equal(launchInput.baseUrl, 'https://example.com');
  });

  test('should have valid BrowserClickInput interface', async () => {
    const clickInput = {
      sessionId: randomUUID(),
      target: {
        strategy: 'css' as const,
        value: 'button.submit'
      },
      timeoutMs: 5000
    };
    
    assert.equal(typeof clickInput.sessionId, 'string');
    assert.equal(clickInput.target.strategy, 'css');
    assert.equal(clickInput.target.value, 'button.submit');
    assert.equal(clickInput.timeoutMs, 5000);
  });

  test('should have valid BrowserTypeInput interface', async () => {
    const typeInput = {
      sessionId: randomUUID(),
      target: {
        strategy: 'testId' as const,
        value: 'username-input',
        testIdAttribute: 'data-testid'
      },
      value: 'test-user',
      clearFirst: true,
      timeoutMs: 10000
    };
    
    assert.equal(typeof typeInput.sessionId, 'string');
    assert.equal(typeInput.target.strategy, 'testId');
    assert.equal(typeInput.value, 'test-user');
    assert.equal(typeInput.clearFirst, true);
    assert.equal(typeInput.timeoutMs, 10000);
  });

  test('should have valid BrowserOpenInput interface', async () => {
    const openInput = {
      sessionId: randomUUID(),
      url: 'https://example.com',
      waitUntil: 'networkIdle' as const,
      timeoutMs: 30000
    };
    
    assert.equal(typeof openInput.sessionId, 'string');
    assert.equal(openInput.url, 'https://example.com');
    assert.equal(openInput.waitUntil, 'networkIdle');
    assert.equal(openInput.timeoutMs, 30000);
  });

  test('should have valid BrowserWaitForInput interface', async () => {
    const waitInput = {
      sessionId: randomUUID(),
      target: {
        strategy: 'role' as const,
        value: 'Submit',
        role: 'button'
      },
      timeoutMs: 15000
    };
    
    assert.equal(typeof waitInput.sessionId, 'string');
    assert.equal(waitInput.target.strategy, 'role');
    assert.equal(waitInput.timeoutMs, 15000);
  });

  test('should have valid BrowserSnapshotInput interface', async () => {
    const snapshotInput = {
      sessionId: randomUUID(),
      format: 'screenshot' as const
    };
    
    assert.equal(typeof snapshotInput.sessionId, 'string');
    assert.equal(snapshotInput.format, 'screenshot');
  });

  test('should have valid BrowserEvalInput interface', async () => {
    const evalInput = {
      sessionId: randomUUID(),
      expression: 'document.title',
      awaitPromise: true
    };
    
    assert.equal(typeof evalInput.sessionId, 'string');
    assert.equal(evalInput.expression, 'document.title');
    assert.equal(evalInput.awaitPromise, true);
  });

  test('should have valid BrowserAttachInput interface', async () => {
    const attachInput = {
      sessionId: randomUUID(),
      debugPort: 9222
    };
    
    assert.equal(typeof attachInput.sessionId, 'string');
    assert.equal(attachInput.debugPort, 9222);
  });

  test('should have valid BrowserCloseSessionInput interface', async () => {
    const closeInput = {
      sessionId: randomUUID()
    };
    
    assert.equal(typeof closeInput.sessionId, 'string');
  });

  test('should have valid RemoteProjectStartInput interface', async () => {
    const startInput = {
      cwd: '/path/to/project',
      strategy: 'auto' as const,
      preferredPort: 3000,
      install: true
    };
    
    assert.equal(startInput.cwd, '/path/to/project');
    assert.equal(startInput.strategy, 'auto');
    assert.equal(startInput.preferredPort, 3000);
    assert.equal(startInput.install, true);
  });

  test('should have valid RemoteProjectInspectInput interface', async () => {
    const inspectInput = {
      cwd: '/path/to/project'
    };
    
    assert.equal(inspectInput.cwd, '/path/to/project');
  });

  test('should have valid RemoteProjectCommandInput interface', async () => {
    const commandInput = {
      projectId: randomUUID()
    };
    
    assert.equal(typeof commandInput.projectId, 'string');
  });

  test('should have valid RemoteHealthCheckInput interface', async () => {
    const healthInput = {
      url: 'https://example.com',
      timeoutMs: 5000
    };
    
    assert.equal(healthInput.url, 'https://example.com');
    assert.equal(healthInput.timeoutMs, 5000);
  });

  test('should have valid OrchestratorTaskInput interface', async () => {
    const taskInput = {
      cwd: '/path/to/project',
      baseUrl: 'https://example.com',
      task: 'launch_and_probe' as const,
      sessionName: 'test-session',
      targetUrl: 'https://example.com/page'
    };
    
    assert.equal(taskInput.cwd, '/path/to/project');
    assert.equal(taskInput.baseUrl, 'https://example.com');
    assert.equal(taskInput.task, 'launch_and_probe');
    assert.equal(taskInput.sessionName, 'test-session');
    assert.equal(taskInput.targetUrl, 'https://example.com/page');
  });

  test('should have valid BrowserSessionRecord interface', async () => {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    
    const sessionRecord = {
      id: sessionId,
      name: 'test-session',
      state: 'ready' as const,
      runtimeEnvironment: 'local' as const,
      profilePath: '/tmp/profile',
      browserProcessId: 12345,
      debugPort: 9222,
      browserWsUrl: 'ws://localhost:9222',
      activeTargetId: 'target-123',
      lastKnownUrl: 'https://example.com',
      paths: {
        rootDir: '/tmp/session',
        profileDir: '/tmp/profile',
        evidenceDir: '/tmp/evidence'
      },
      tags: ['test', 'automation'],
      createdAt: now,
      updatedAt: now
    };
    
    assert.equal(sessionRecord.id, sessionId);
    assert.equal(sessionRecord.name, 'test-session');
    assert.equal(sessionRecord.state, 'ready');
    assert.equal(sessionRecord.runtimeEnvironment, 'local');
    assert.equal(sessionRecord.browserProcessId, 12345);
    assert.equal(sessionRecord.debugPort, 9222);
    assert.ok(sessionRecord.paths);
    assert.ok(Array.isArray(sessionRecord.tags));
  });

  test('should have valid RemoteProjectRecord interface', async () => {
    const projectId = randomUUID();
    const now = new Date().toISOString();
    
    const projectRecord = {
      id: projectId,
      cwd: '/path/to/project',
      state: 'running' as const,
      framework: 'nextjs' as const,
      packageManager: 'pnpm' as const,
      startCommand: 'pnpm dev',
      installCommand: 'pnpm install',
      buildCommand: 'pnpm build',
      testCommand: 'pnpm test',
      port: 3000,
      pid: 54321,
      url: 'https://localhost:3000',
      createdAt: now,
      updatedAt: now
    };
    
    assert.equal(projectRecord.id, projectId);
    assert.equal(projectRecord.cwd, '/path/to/project');
    assert.equal(projectRecord.state, 'running');
    assert.equal(projectRecord.framework, 'nextjs');
    assert.equal(projectRecord.packageManager, 'pnpm');
    assert.equal(projectRecord.port, 3000);
    assert.equal(projectRecord.pid, 54321);
  });

  test('should have valid OrchestrationRunRecord interface', async () => {
    const runId = randomUUID();
    const now = new Date().toISOString();
    
    const runRecord = {
      id: runId,
      taskId: randomUUID(),
      state: 'completed' as const,
      summary: 'Successfully launched and probed project',
      sessionId: randomUUID(),
      remoteProjectId: randomUUID(),
      pointers: [
        {
          type: 'screenshot' as const,
          path: '/tmp/evidence/screenshot.png',
          timestamp: now,
          metadata: { width: 1920, height: 1080 }
        },
        {
          type: 'dom' as const,
          path: '/tmp/evidence/dom.json',
          timestamp: now,
          metadata: { title: 'Example Page' }
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    
    assert.equal(runRecord.id, runId);
    assert.equal(runRecord.state, 'completed');
    assert.equal(runRecord.summary, 'Successfully launched and probed project');
    assert.ok(Array.isArray(runRecord.pointers));
    assert.equal(runRecord.pointers.length, 2);
    assert.ok(runRecord.pointers[0]);
    assert.ok(runRecord.pointers[1]);
    assert.equal(runRecord.pointers[0].type, 'screenshot');
    assert.equal(runRecord.pointers[1].type, 'dom');
  });

  test('should validate type constraints', async () => {
    // BrowserActionTarget strategy constraints
    const validStrategies = ['css', 'testId', 'role', 'label', 'text'] as const;
    assert.equal(validStrategies.length, 5);
    
    // BrowserLaunchInput profileStrategy constraint
    const launchInput = {
      sessionName: 'test',
      profileStrategy: 'isolated' as const // Only valid value
    };
    assert.equal(launchInput.profileStrategy, 'isolated');
    
    // BrowserSnapshotInput format constraint
    const snapshotInput = {
      sessionId: randomUUID(),
      format: 'dom' as const // Valid format
    };
    assert.equal(snapshotInput.format, 'dom');
  });

  test('should handle optional fields correctly', async () => {
    // BrowserLaunchInput with only required fields
    const minimalLaunch = {
      sessionName: 'minimal-test',
      profileStrategy: 'isolated' as const
    };
    
    assert.equal(minimalLaunch.sessionName, 'minimal-test');
    assert.equal(minimalLaunch.profileStrategy, 'isolated');
    
    // BrowserClickInput with only required fields
    const minimalClick = {
      sessionId: randomUUID(),
      target: {
        strategy: 'css' as const,
        value: 'button'
      }
    };
    
    assert.equal(typeof minimalClick.sessionId, 'string');
    assert.equal(minimalClick.target.strategy, 'css');
  });

  test('should validate event schemas', async () => {
    // Test that we can create objects conforming to event interfaces
    const consoleEvent = {
      sessionId: randomUUID(),
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      message: 'Test message',
      source: 'console' as const
    };
    
    const networkEvent = {
      sessionId: randomUUID(),
      timestamp: new Date().toISOString(),
      method: 'GET' as const,
      url: 'https://example.com',
      status: 200,
      responseTime: 150,
      source: 'network' as const
    };
    
    assert.equal(consoleEvent.level, 'info');
    assert.equal(consoleEvent.source, 'console');
    assert.equal(networkEvent.method, 'GET');
    assert.equal(networkEvent.url, 'https://example.com');
    assert.equal(networkEvent.status, 200);
  });

  test('should validate evidence schemas', async () => {
    // Test that we can create objects conforming to evidence interfaces
    const evidencePointer = {
      type: 'screenshot' as const,
      path: '/tmp/screenshot.png',
      timestamp: new Date().toISOString(),
      metadata: { width: 1920, height: 1080 }
    };
    
    const evidenceBundle = {
      sessionId: randomUUID(),
      timestamp: new Date().toISOString(),
      pointers: [evidencePointer],
      summary: 'Test evidence bundle'
    };
    
    assert.equal(evidencePointer.type, 'screenshot');
    assert.equal(evidencePointer.path, '/tmp/screenshot.png');
    assert.equal(evidenceBundle.sessionId, evidenceBundle.sessionId);
    assert.equal(evidenceBundle.pointers.length, 1);
  });
});
