import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

// Test selector engine functionality
describe('Selector Engine', () => {
  test('should have required exports', async () => {
    const module = await import('../src/index.js');
    
    // Check that the main function exists
    assert.ok(module.rankTarget, 'rankTarget should exist');
    assert.equal(typeof module.rankTarget, 'function');
  });

  test('should rank CSS selectors correctly', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'css' as const,
      value: 'button.submit'
    };
    
    const ranked = rankTarget(target);
    
    // Verify structure
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, 'button.submit');
    assert.equal(ranked[0].confidence, 0.75);
    assert.equal(ranked[0].source, 'css');
    assert.equal(typeof ranked[0].jsResolver, 'string');
    assert.ok(ranked[0].jsResolver.includes('document.querySelector'));
  });

  test('should rank testId selectors correctly', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'testId' as const,
      value: 'submit-button',
      testIdAttribute: 'data-testid'
    };
    
    const ranked = rankTarget(target);
    
    // Verify structure
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, '[data-testid="submit-button"]');
    assert.equal(ranked[0].confidence, 1);
    assert.equal(ranked[0].source, 'testId');
    assert.ok(ranked[0].jsResolver.includes('data-testid'));
  });

  test('should rank role selectors correctly', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'role' as const,
      value: 'Submit',
      role: 'button'
    };
    
    const ranked = rankTarget(target);
    
    // Verify structure
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, '[role="button"]');
    assert.equal(ranked[0].confidence, 0.9);
    assert.equal(ranked[0].source, 'role');
    assert.ok(ranked[0].jsResolver.includes('roleValue = \"button\"'));
  });

  test('should rank label selectors correctly', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'label' as const,
      value: 'Username'
    };
    
    const ranked = rankTarget(target);
    
    // Verify structure
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, 'label:Username');
    assert.equal(ranked[0].confidence, 0.85);
    assert.equal(ranked[0].source, 'label');
    assert.ok(ranked[0].jsResolver.includes('Username'));
  });

  test('should rank text selectors correctly', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'text' as const,
      value: 'Click me'
    };
    
    const ranked = rankTarget(target);
    
    // Verify structure
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, 'text=Click me');
    assert.equal(ranked[0].confidence, 0.65);
    assert.equal(ranked[0].source, 'text');
    assert.ok(ranked[0].jsResolver.includes('Click me'));
  });

  test('should handle testId with default attribute', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'testId' as const,
      value: 'my-button'
      // No testIdAttribute specified
    };
    
    const ranked = rankTarget(target);
    
    // Should use default 'data-testid'
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, '[data-testid="my-button"]');
    assert.equal(ranked[0].confidence, 1);
  });

  test('should handle role with default button', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'role' as const,
      value: 'Submit'
      // No role specified
    };
    
    const ranked = rankTarget(target);
    
    // Should use default 'button'
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, '[role="button"]');
    assert.equal(ranked[0].confidence, 0.9);
  });

  test('should generate valid JavaScript resolvers', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const strategies = [
      { strategy: 'css' as const, value: '.my-class' },
      { strategy: 'testId' as const, value: 'test-id', testIdAttribute: 'data-test' },
      { strategy: 'role' as const, value: 'Submit', role: 'button' },
      { strategy: 'label' as const, value: 'Username' },
      { strategy: 'text' as const, value: 'Hello World' }
    ];
    
    for (const target of strategies) {
      const ranked = rankTarget(target);
      
      // Each resolver should be valid JavaScript
      assert.ok(ranked[0]);
      assert.ok(ranked[0].jsResolver.includes('(() =>'));
      assert.ok(ranked[0].jsResolver.includes(')()'));
      assert.ok(ranked[0].jsResolver.length > 10);
    }
  });

  test('should escape special characters in values', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'css' as const,
      value: 'button[data-action="submit"]'
    };
    
    const ranked = rankTarget(target);
    
    // Should properly escape quotes
    assert.ok(ranked[0]);
    assert.ok(ranked[0].jsResolver.includes('data-action=\\\"submit\\\"'));
  });

  test('should handle empty values gracefully', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'css' as const,
      value: ''
    };
    
    const ranked = rankTarget(target);
    
    // Should still generate a selector
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, '');
    assert.ok(ranked[0].jsResolver.includes('document.querySelector'));
  });

  test('should maintain confidence ordering', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const targets = [
      { strategy: 'testId' as const, value: 'test' },
      { strategy: 'role' as const, value: 'test', role: 'button' },
      { strategy: 'label' as const, value: 'test' },
      { strategy: 'css' as const, value: 'test' },
      { strategy: 'text' as const, value: 'test' }
    ];
    
    const confidences = targets.map(t => {
      const ranked = rankTarget(t);
      assert.ok(ranked[0]);
      return ranked[0].confidence;
    });
    
    // Should be ordered from highest to lowest confidence
    assert.equal(confidences[0], 1); // testId
    assert.equal(confidences[1], 0.9); // role
    assert.equal(confidences[2], 0.85); // label
    assert.equal(confidences[3], 0.75); // css
    assert.equal(confidences[4], 0.65); // text
  });

  test('should handle complex CSS selectors', async () => {
    const { rankTarget } = await import('../src/index.js');
    
    const target = {
      strategy: 'css' as const,
      value: 'form input[type="email"]:required'
    };
    
    const ranked = rankTarget(target);
    
    // Should handle complex selector
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0]);
    assert.equal(ranked[0].selector, 'form input[type="email"]:required');
    assert.ok(ranked[0].jsResolver.includes('form input[type=\\\"email\\\"]:required'));
  });
});
