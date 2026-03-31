import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

// Test action engine functionality
describe('Action Engine', () => {
  test('should have required exports', async () => {
    // Import from the built source
    const module = await import('../src/index.js');
    
    // Check that all required functions exist
    assert.ok(module.planClick, 'planClick should exist');
    assert.ok(module.planType, 'planType should exist');
    assert.ok(module.planWait, 'planWait should exist');
    assert.ok(module.planScroll, 'planScroll should exist');
    assert.ok(module.planHover, 'planHover should exist');
    
    assert.equal(typeof module.planClick, 'function');
    assert.equal(typeof module.planType, 'function');
    assert.equal(typeof module.planWait, 'function');
    assert.equal(typeof module.planScroll, 'function');
    assert.equal(typeof module.planHover, 'function');
  });

  test('should plan click actions correctly', async () => {
    const { planClick } = await import('../src/index.js');
    
    const input = {
      sessionId: 'test-session',
      target: {
        strategy: 'css' as const,
        value: 'button.submit'
      }
    };
    
    const plan = planClick(input);
    
    // Verify plan structure
    assert.equal(plan.kind, 'click');
    assert.equal(plan.target.value, 'button.submit');
    assert.equal(plan.selector, 'button.submit');
    assert.equal(typeof plan.jsResolver, 'string');
    assert.ok(plan.jsResolver.includes('button.submit'));
    assert.equal(plan.timeoutMs, 10000);
  });

  test('should plan type actions correctly', async () => {
    const { planType } = await import('../src/index.js');
    
    const input = {
      sessionId: 'test-session',
      target: {
        strategy: 'testId' as const,
        value: 'username-input',
        testIdAttribute: 'data-testid'
      },
      value: 'test-user'
    };
    
    const plan = planType(input);
    
    // Verify plan structure
    assert.equal(plan.kind, 'type');
    assert.equal(plan.target.value, 'username-input');
    assert.equal(plan.payload, 'test-user');
    assert.equal(typeof plan.jsResolver, 'string');
    assert.ok(plan.jsResolver.includes('data-testid'));
    assert.equal(plan.timeoutMs, 10000);
  });

  test('should plan wait actions correctly', async () => {
    const { planWait } = await import('../src/index.js');
    
    const target = {
      strategy: 'role' as const,
      value: 'button',
      role: 'submit'
    };
    const timeoutMs = 5000;
    
    const plan = planWait(target, timeoutMs);
    
    // Verify plan structure
    assert.equal(plan.kind, 'wait');
    assert.equal(plan.target.value, 'button');
    assert.equal(plan.selector, '[role="submit"]');
    assert.equal(typeof plan.jsResolver, 'string');
    assert.ok(plan.jsResolver.includes('button'));
    assert.equal(plan.timeoutMs, timeoutMs);
  });

  test('should plan scroll actions correctly', async () => {
    const { planScroll } = await import('../src/index.js');
    
    const target = {
      strategy: 'css' as const,
      value: '.scrollable-container'
    };
    const direction = 'down' as const;
    const amount = 100;
    
    const plan = planScroll(target, direction, amount);
    
    // Verify plan structure
    assert.equal(plan.kind, 'scroll');
    assert.equal(plan.target.value, '.scrollable-container');
    assert.equal(plan.selector, '.scrollable-container');
    assert.equal(typeof plan.jsResolver, 'string');
    assert.ok(plan.jsResolver.includes('.scrollable-container'));
    assert.equal(plan.timeoutMs, 5000);
    
    // Verify scroll payload
    const payload = JSON.parse(plan.payload || '{}');
    assert.equal(payload.direction, direction);
    assert.equal(payload.amount, amount);
  });

  test('should plan hover actions correctly', async () => {
    const { planHover } = await import('../src/index.js');
    
    const target = {
      strategy: 'label' as const,
      value: 'Submit Button'
    };
    
    const plan = planHover(target);
    
    // Verify plan structure
    assert.equal(plan.kind, 'hover');
    assert.equal(plan.target.value, 'Submit Button');
    assert.equal(plan.selector, 'label:Submit Button');
    assert.equal(typeof plan.jsResolver, 'string');
    assert.ok(plan.jsResolver.includes('Submit Button'));
    assert.equal(plan.timeoutMs, 5000);
  });

  test('should handle different target strategies', async () => {
    const { planClick } = await import('../src/index.js');
    
    // Test all supported strategies
    const strategies = ['css', 'testId', 'role', 'label', 'text'] as const;
    
    for (const strategy of strategies) {
      const input = {
        sessionId: 'test-session',
        target: {
          strategy,
          value: `test-${strategy}-${randomUUID()}`,
          ...(strategy === 'testId' ? { testIdAttribute: 'data-testid' } : {}),
          ...(strategy === 'role' ? { role: 'button' } : {})
        }
      };
      
      const plan = planClick(input);
      
      assert.equal(plan.kind, 'click');
      assert.equal(plan.target.value, input.target.value);
      assert.ok(plan.jsResolver.length > 0);
      assert.ok(plan.confidence > 0);
    }
  });

  test('should handle optional parameters correctly', async () => {
    const { planType } = await import('../src/index.js');
    
    const input = {
      sessionId: 'test-session',
      target: {
        strategy: 'css' as const,
        value: '#input-field'
      },
      value: 'test-value',
      timeoutMs: 15000
    };
    
    const plan = planType(input);
    
    assert.equal(plan.timeoutMs, 15000);
    assert.equal(plan.payload, 'test-value');
  });

  test('should generate valid JavaScript resolvers', async () => {
    const { planClick } = await import('../src/index.js');
    
    const input = {
      sessionId: 'test-session',
      target: {
        strategy: 'css' as const,
        value: 'button[data-action="submit"]'
      }
    };
    
    const plan = planClick(input);
    
    // Verify that the resolver is valid JavaScript
    assert.ok(plan.jsResolver.includes('document.querySelector'));
    assert.ok(plan.jsResolver.includes('button[data-action='));
    assert.ok(plan.jsResolver.includes('()'));
  });

  test('should handle scroll with default parameters', async () => {
    const { planScroll } = await import('../src/index.js');
    
    const target = {
      strategy: 'css' as const,
      value: '.container'
    };
    
    const plan = planScroll(target);
    
    // Verify default values
    assert.equal(plan.kind, 'scroll');
    assert.equal(plan.timeoutMs, 5000);
    
    const payload = JSON.parse(plan.payload || '{}');
    assert.equal(payload.direction, 'down');
    assert.equal(payload.amount, 300);
  });

  test('should handle wait with default timeout', async () => {
    const { planWait } = await import('../src/index.js');
    
    const target = {
      strategy: 'css' as const,
      value: '.element'
    };
    
    const plan = planWait(target);
    
    // Verify default timeout
    assert.equal(plan.kind, 'wait');
    assert.equal(plan.timeoutMs, 10000);
  });
});
