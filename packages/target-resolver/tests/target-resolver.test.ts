import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

// Test target resolver implementation
describe('Target Resolver', () => {
  test('should have required exports', async () => {
    const module = await import('../src/index.js');
    
    // Check that all required functions exist
    assert.ok(module.resolveTargetByUrl, 'resolveTargetByUrl should exist');
    assert.ok(module.resolveBestTarget, 'resolveBestTarget should exist');
    assert.equal(typeof module.resolveTargetByUrl, 'function');
    assert.equal(typeof module.resolveBestTarget, 'function');
  });

  test('should resolve target by exact URL match', async () => {
    const { resolveTargetByUrl } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Home Page',
        url: 'https://example.com',
        type: 'page'
      },
      {
        id: 'target2',
        title: 'About Page',
        url: 'https://example.com/about',
        type: 'page'
      },
      {
        id: 'target3',
        title: 'API Endpoint',
        url: 'https://api.example.com',
        type: 'api'
      }
    ];
    
    const resolved = resolveTargetByUrl(targets, 'https://example.com/about');
    
    assert.ok(resolved);
    assert.equal(resolved.id, 'target2');
    assert.equal(resolved.title, 'About Page');
    assert.equal(resolved.url, 'https://example.com/about');
    assert.equal(resolved.type, 'page');
  });

  test('should return undefined when no URL match found', async () => {
    const { resolveTargetByUrl } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Home Page',
        url: 'https://example.com',
        type: 'page'
      }
    ];
    
    const resolved = resolveTargetByUrl(targets, 'https://nonexistent.com');
    
    assert.equal(resolved, undefined);
  });

  test('should handle empty targets array', async () => {
    const { resolveTargetByUrl } = await import('../src/index.js');
    
    const resolved = resolveTargetByUrl([], 'https://example.com');
    
    assert.equal(resolved, undefined);
  });

  test('should resolve best target with preferred URL', async () => {
    const { resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Home Page',
        url: 'https://example.com',
        type: 'page'
      },
      {
        id: 'target2',
        title: 'About Page',
        url: 'https://example.com/about',
        type: 'page'
      }
    ];
    
    const resolved = resolveBestTarget(targets, 'https://example.com/about');
    
    assert.ok(resolved);
    assert.equal(resolved.id, 'target2');
    assert.equal(resolved.url, 'https://example.com/about');
  });

  test('should resolve best target without preferred URL', async () => {
    const { resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Home Page',
        url: 'https://example.com',
        type: 'page'
      },
      {
        id: 'target2',
        title: 'API Endpoint',
        url: 'ws://localhost:3000',
        type: 'websocket'
      },
      {
        id: 'target3',
        title: 'Resource',
        url: 'file:///path/to/resource',
        type: 'resource'
      }
    ];
    
    const resolved = resolveBestTarget(targets);
    
    // Should prefer page type with http URL
    assert.ok(resolved);
    assert.equal(resolved.id, 'target1');
    assert.equal(resolved.type, 'page');
    assert.equal(resolved.url, 'https://example.com');
  });

  test('should fall back to page type when no http page available', async () => {
    const { resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'API Endpoint',
        url: 'ws://localhost:3000',
        type: 'api'
      },
      {
        id: 'target2',
        title: 'Local Page',
        url: 'file:///path/to/page.html',
        type: 'page'
      },
      {
        id: 'target3',
        title: 'Resource',
        url: 'file:///path/to/resource',
        type: 'resource'
      }
    ];
    
    const resolved = resolveBestTarget(targets);
    
    // Should prefer page type even if not http
    assert.ok(resolved);
    assert.equal(resolved.id, 'target2');
    assert.equal(resolved.type, 'page');
    assert.equal(resolved.url, 'file:///path/to/page.html');
  });

  test('should fall back to first target when no page type available', async () => {
    const { resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'API Endpoint',
        url: 'ws://localhost:3000',
        type: 'api'
      },
      {
        id: 'target2',
        title: 'Resource',
        url: 'file:///path/to/resource',
        type: 'resource'
      }
    ];
    
    const resolved = resolveBestTarget(targets);
    
    // Should return first target as fallback
    assert.ok(resolved);
    assert.equal(resolved.id, 'target1');
    assert.equal(resolved.type, 'api');
  });

  test('should handle undefined type in targets', async () => {
    const { resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Unknown Target',
        url: 'https://example.com',
        type: undefined
      },
      {
        id: 'target2',
        title: 'API Endpoint',
        url: 'ws://localhost:3000',
        type: 'api'
      }
    ];
    
    const resolved = resolveBestTarget(targets);
    
    // Should prefer http target even with undefined type
    assert.ok(resolved);
    assert.equal(resolved.id, 'target1');
    assert.equal(resolved.url, 'https://example.com');
  });

  test('should handle targets with same URL but different types', async () => {
    const { resolveTargetByUrl, resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Page Version',
        url: 'https://example.com',
        type: 'page'
      },
      {
        id: 'target2',
        title: 'API Version',
        url: 'https://example.com',
        type: 'api'
      }
    ];
    
    // resolveTargetByUrl should return first match
    const byUrl = resolveTargetByUrl(targets, 'https://example.com');
    assert.ok(byUrl);
    assert.equal(byUrl.id, 'target1');
    assert.equal(byUrl.type, 'page');
    
    // resolveBestTarget should prefer page type
    const best = resolveBestTarget(targets, 'https://example.com');
    assert.ok(best);
    assert.equal(best.id, 'target1');
    assert.equal(best.type, 'page');
  });

  test('should handle complex URL matching', async () => {
    const { resolveTargetByUrl } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Complex URL',
        url: 'https://example.com/path/to/page?query=value#fragment',
        type: 'page'
      },
      {
        id: 'target2',
        title: 'Simple URL',
        url: 'https://example.com',
        type: 'page'
      }
    ];
    
    const resolved = resolveTargetByUrl(targets, 'https://example.com/path/to/page?query=value#fragment');
    
    assert.ok(resolved);
    assert.equal(resolved.id, 'target1');
    assert.equal(resolved.url, 'https://example.com/path/to/page?query=value#fragment');
  });

  test('should validate BrowserTarget interface structure', async () => {
    const { resolveTargetByUrl } = await import('../src/index.js');
    
    const validTargets = [
      {
        id: randomUUID(),
        title: 'Test Target',
        url: 'https://example.com',
        type: 'page'
      },
      {
        id: randomUUID(),
        title: 'Target without type',
        url: 'https://example.com/api',
        type: undefined
      }
    ];
    
    const resolved1 = resolveTargetByUrl(validTargets, validTargets[0]!.url);
    const resolved2 = resolveTargetByUrl(validTargets, validTargets[1]!.url);
    
    assert.ok(resolved1);
    assert.ok(resolved2);
    assert.equal(typeof resolved1!.id, 'string');
    assert.equal(typeof resolved1!.title, 'string');
    assert.equal(typeof resolved1!.url, 'string');
    assert.ok(resolved1!.type === 'page' || resolved1!.type === undefined);
  });

  test('should handle case-sensitive URL matching', async () => {
    const { resolveTargetByUrl } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Mixed Case URL',
        url: 'https://Example.com/Mixed/Path',
        type: 'page'
      }
    ];
    
    // Exact match should work
    const exactMatch = resolveTargetByUrl(targets, 'https://Example.com/Mixed/Path');
    assert.ok(exactMatch);
    assert.equal(exactMatch.id, 'target1');
    
    // Different case should not match (URLs are case-sensitive)
    const noMatch = resolveTargetByUrl(targets, 'https://example.com/mixed/path');
    assert.equal(noMatch, undefined);
  });

  test('should handle URL with special characters', async () => {
    const { resolveTargetByUrl } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Special Characters',
        url: 'https://example.com/path with spaces/encoded%20path',
        type: 'page'
      }
    ];
    
    const resolved = resolveTargetByUrl(targets, 'https://example.com/path with spaces/encoded%20path');
    
    assert.ok(resolved);
    assert.equal(resolved.id, 'target1');
    assert.equal(resolved.url, 'https://example.com/path with spaces/encoded%20path');
  });

  test('should handle empty string URLs', async () => {
    const { resolveTargetByUrl, resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Empty URL',
        url: '',
        type: 'page'
      },
      {
        id: 'target2',
        title: 'Normal URL',
        url: 'https://example.com',
        type: 'page'
      }
    ];
    
    // Should be able to find empty URL target
    const emptyResolved = resolveTargetByUrl(targets, '');
    assert.ok(emptyResolved);
    assert.equal(emptyResolved.id, 'target1');
    
    // Best target should still prefer http page
    const bestResolved = resolveBestTarget(targets);
    assert.ok(bestResolved);
    assert.ok(bestResolved);
    assert.equal(bestResolved!.id, 'target2');
  });

  test('should handle null and undefined URLs in targets', async () => {
    const { resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Null URL',
        url: null as unknown as string,
        type: 'page'
      },
      {
        id: 'target2',
        title: 'Undefined URL',
        url: undefined as unknown as string,
        type: 'page'
      },
      {
        id: 'target3',
        title: 'Valid URL',
        url: 'https://example.com',
        type: 'page'
      }
    ];
    
    const resolved = resolveBestTarget(targets);
    assert.ok(resolved);
    assert.equal(resolved?.id, 'target3');

    // Test with only valid URLs should work
    const validTargets = [
      {
        id: 'target1',
        title: 'Valid URL 1',
        url: 'https://example.com/1',
        type: 'page'
      },
      {
        id: 'target2',
        title: 'Valid URL 2',
        url: 'https://example.com/2',
        type: 'api'
      }
    ];
    
    const resolved = resolveBestTarget(validTargets);
    assert.ok(resolved);
    assert.equal(resolved!.id, 'target1');
    assert.equal(resolved!.url, 'https://example.com/1');
  });

  test('should handle target resolution priority correctly', async () => {
    const { resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      // Lowest priority: non-page, non-http
      {
        id: 'target1',
        title: 'WebSocket',
        url: 'ws://localhost:3000',
        type: 'websocket'
      },
      // Middle priority: page but not http
      {
        id: 'target2',
        title: 'File Page',
        url: 'file:///path/to/page.html',
        type: 'page'
      },
      // Highest priority: page with http
      {
        id: 'target3',
        title: 'HTTP Page',
        url: 'https://example.com',
        type: 'page'
      }
    ];
    
    const resolved = resolveBestTarget(targets);
    
    // Should select the highest priority target
    assert.ok(resolved);
    assert.ok(resolved);
    assert.equal(resolved!.id, 'target3');
    assert.equal(resolved!.type, 'page');
    assert.ok(resolved!.url.startsWith('http'));
  });

  test('should handle concurrent resolution operations', async () => {
    const { resolveTargetByUrl, resolveBestTarget } = await import('../src/index.js');
    
    const targets = [
      {
        id: 'target1',
        title: 'Target 1',
        url: 'https://example.com/1',
        type: 'page'
      },
      {
        id: 'target2',
        title: 'Target 2',
        url: 'https://example.com/2',
        type: 'page'
      },
      {
        id: 'target3',
        title: 'Target 3',
        url: 'https://example.com/3',
        type: 'page'
      }
    ];
    
    // Run multiple resolution operations concurrently
    const results = await Promise.all([
      resolveTargetByUrl(targets, 'https://example.com/1'),
      resolveTargetByUrl(targets, 'https://example.com/2'),
      resolveBestTarget(targets, 'https://example.com/3'),
      resolveBestTarget(targets)
    ]);
    
    assert.equal(results.length, 4);
    assert.ok(results[0]);
    assert.ok(results[1]);
    assert.ok(results[2]);
    assert.ok(results[3]);
    
    assert.equal(results[0].id, 'target1');
    assert.equal(results[1].id, 'target2');
    assert.equal(results[2].id, 'target3');
    assert.equal(results[3].id, 'target1'); // Best target should be first http page
  });

  test('should maintain immutability of target arrays', async () => {
    const { resolveTargetByUrl, resolveBestTarget } = await import('../src/index.js');
    
    const originalTargets = [
      {
        id: 'target1',
        title: 'Original Target',
        url: 'https://example.com',
        type: 'page'
      }
    ];
    
    // Create a copy to test immutability
    const targetsCopy = JSON.parse(JSON.stringify(originalTargets));
    
    resolveTargetByUrl(targetsCopy, 'https://example.com');
    resolveBestTarget(targetsCopy);
    
    // Original targets should remain unchanged
    assert.deepEqual(originalTargets, targetsCopy);
    assert.ok(originalTargets[0]);
    assert.ok(originalTargets[0]);
    assert.equal(originalTargets[0].id, 'target1');
    assert.equal(originalTargets[0].title, 'Original Target');
  });
});
