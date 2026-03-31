import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';

// Test retry policy implementation
describe('Retry Policy', () => {
  test('should have required exports', async () => {
    const module = await import('../src/index.js');
    
    // Check that all required functions exist
    assert.ok(module.classifyRetry, 'classifyRetry should exist');
    assert.ok(module.withRetry, 'withRetry should exist');
    assert.equal(typeof module.classifyRetry, 'function');
    assert.equal(typeof module.withRetry, 'function');
  });

  test('should classify retry decisions correctly', async () => {
    const { classifyRetry } = await import('../src/index.js');
    
    // Test within max attempts
    const decision1 = classifyRetry(1, 5);
    assert.equal(decision1.shouldRetry, true);
    assert.equal(decision1.reason, 'initial_retry');
    assert.ok(decision1.delayMs > 0);
    assert.ok(decision1.delayMs <= 5000); // Should be min(5000, 1*500)
    
    // Test retry on subsequent attempts
    const decision2 = classifyRetry(2, 5);
    assert.equal(decision2.shouldRetry, true);
    assert.equal(decision2.reason, 'transient_candidate');
    assert.ok(decision2.delayMs > 0);
    assert.ok(decision2.delayMs <= 5000); // Should be min(5000, 2*500)
    
    // Test at max attempts
    const decision3 = classifyRetry(5, 5);
    assert.equal(decision3.shouldRetry, false);
    assert.equal(decision3.reason, 'retry_budget_exhausted');
    assert.equal(decision3.delayMs, 0);
    
    // Test beyond max attempts
    const decision4 = classifyRetry(6, 5);
    assert.equal(decision4.shouldRetry, false);
    assert.equal(decision4.reason, 'retry_budget_exhausted');
    assert.equal(decision4.delayMs, 0);
  });

  test('should calculate delay correctly based on attempt number', async () => {
    const { classifyRetry } = await import('../src/index.js');
    
    // Test delay calculation pattern
    const delay1 = classifyRetry(1, 10).delayMs;
    const delay2 = classifyRetry(2, 10).delayMs;
    const delay3 = classifyRetry(3, 10).delayMs;
    const delay4 = classifyRetry(10, 10).delayMs;
    const delay5 = classifyRetry(11, 10).delayMs;
    
    assert.equal(delay1, 500); // min(5000, 1*500)
    assert.equal(delay2, 1000); // min(5000, 2*500)
    assert.equal(delay3, 1500); // min(5000, 3*500)
    assert.equal(delay4, 0); // At max attempts, no delay
    assert.equal(delay5, 0); // Beyond max attempts, no delay
    
    // Test with different max attempts
    const delay6 = classifyRetry(1, 3).delayMs;
    const delay7 = classifyRetry(3, 3).delayMs;
    
    assert.equal(delay6, 500);
    assert.equal(delay7, 0); // At max attempts
  });

  test('should execute operation successfully on first try', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let callCount = 0;
    const successfulOperation = async (attempt: number) => {
      callCount++;
      assert.equal(attempt, 1); // Should only be called once
      return 'success-result';
    };
    
    const result = await withRetry(3, successfulOperation);
    
    assert.equal(result, 'success-result');
    assert.equal(callCount, 1);
  });

  test('should retry operation until success', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let attemptCount = 0;
    const eventuallySuccessfulOperation = async (attempt: number) => {
      attemptCount++;
      if (attempt < 3) {
        throw new Error(`Attempt ${attempt} failed`);
      }
      return `success-on-attempt-${attempt}`;
    };
    
    const result = await withRetry(5, eventuallySuccessfulOperation);
    
    assert.equal(result, 'success-on-attempt-3');
    assert.equal(attemptCount, 3);
  });

  test('should fail after exhausting retries', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let attemptCount = 0;
    const alwaysFailingOperation = async (attempt: number) => {
      attemptCount++;
      throw new Error(`Always fails on attempt ${attempt}`);
    };
    
    try {
      await withRetry(3, alwaysFailingOperation);
      assert.fail('Should have thrown error');
    } catch (error: any) {
      assert.equal(error.message, 'Always fails on attempt 3');
      assert.equal(attemptCount, 3); // Should have tried all attempts
    }
  });

  test('should handle non-Error objects correctly', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let attemptCount = 0;
    const operationThrowingString = async (attempt: number) => {
      attemptCount++;
      if (attempt < 2) {
        throw 'String error';
      }
      return 'success';
    };
    
    const result = await withRetry(3, operationThrowingString);
    
    assert.equal(result, 'success');
    assert.equal(attemptCount, 2);
  });

  test('should handle operation that throws non-Error on final attempt', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let attemptCount = 0;
    const operationThrowingString = async (attempt: number) => {
      attemptCount++;
      throw 'String error';
    };
    
    try {
      await withRetry(2, operationThrowingString);
      assert.fail('Should have thrown error');
    } catch (error: any) {
      assert.equal(error.message, 'String error'); // Should be wrapped in Error
      assert.ok(error instanceof Error);
      assert.equal(attemptCount, 2);
    }
  });

  test('should preserve original Error objects', async () => {
    const { withRetry } = await import('../src/index.js');
    
    const customError = new Error('Custom error message') as Error & { name: string; code: string };
    customError.name = 'CustomError';
    customError.code = 'CUSTOM_CODE';
    
    const failingOperation = async () => {
      throw customError;
    };
    
    try {
      await withRetry(2, failingOperation);
      assert.fail('Should have thrown error');
    } catch (error: any) {
      assert.equal(error, customError); // Should be the same error object
      assert.equal(error.name, 'CustomError');
      assert.equal(error.code, 'CUSTOM_CODE');
    }
  });

  test('should handle zero max attempts', async () => {
    const { withRetry } = await import('../src/index.js');
    
    const operation = async (attempt: number) => {
      throw new Error(`Failed on attempt ${attempt}`);
    };
    
    try {
      await withRetry(0, operation);
      assert.fail('Should have thrown error');
    } catch (error: any) {
      assert.ok(error instanceof Error);
      // With maxAttempts=0, the loop doesn't execute, so lastError is undefined
      // But the implementation converts undefined to Error(String(undefined))
      assert.equal(error.constructor.name, 'Error');
      // The actual behavior is that no attempts are made
    }
  });

  test('should handle negative max attempts', async () => {
    const { withRetry } = await import('../src/index.js');
    
    const operation = async (attempt: number) => {
      throw new Error(`Failed on attempt ${attempt}`);
    };
    
    try {
      await withRetry(-1, operation);
      assert.fail('Should have thrown error');
    } catch (error: any) {
      assert.ok(error instanceof Error);
      // With maxAttempts=-1, the loop doesn't execute, so lastError is undefined
      assert.equal(error.constructor.name, 'Error');
      // The actual behavior is that no attempts are made
    }
  });

  test('should handle large max attempts', async () => {
    const { classifyRetry } = await import('../src/index.js');
    
    // Test with very large max attempts
    const decision = classifyRetry(50, 100);
    assert.equal(decision.shouldRetry, true);
    assert.equal(decision.reason, 'transient_candidate');
    assert.equal(decision.delayMs, 5000); // Should be capped at 5000
    
    // Test attempt near max
    const nearMaxDecision = classifyRetry(99, 100);
    assert.equal(nearMaxDecision.shouldRetry, true);
    assert.equal(nearMaxDecision.delayMs, 5000); // Should be capped at 5000
    
    // Test at max
    const atMaxDecision = classifyRetry(100, 100);
    assert.equal(atMaxDecision.shouldRetry, false);
    assert.equal(atMaxDecision.reason, 'retry_budget_exhausted');
  });

  test('should validate RetryDecision interface structure', async () => {
    const { classifyRetry } = await import('../src/index.js');
    
    const decision = classifyRetry(1, 5);
    
    // Verify RetryDecision structure
    assert.equal(typeof decision.shouldRetry, 'boolean');
    assert.equal(typeof decision.delayMs, 'number');
    assert.equal(typeof decision.reason, 'string');
    assert.ok(decision.reason.length > 0);
    
    // Verify boolean is actually boolean
    assert.ok(decision.shouldRetry === true || decision.shouldRetry === false);
    
    // Verify number is actually number
    assert.ok(typeof decision.delayMs === 'number' && !isNaN(decision.delayMs));
    assert.ok(decision.delayMs >= 0);
  });

  test('should handle edge cases in delay calculation', async () => {
    const { classifyRetry } = await import('../src/index.js');
    
    // Test attempt 1
    const firstAttempt = classifyRetry(1, 10);
    assert.equal(firstAttempt.delayMs, 500);
    
    // Test attempt that would exceed 5000ms cap
    const highAttempt = classifyRetry(20, 25);
    assert.equal(highAttempt.delayMs, 5000); // Should be capped
    
    // Test exact cap threshold
    const capThreshold = classifyRetry(10, 15);
    assert.equal(capThreshold.delayMs, 5000); // 10 * 500 = 5000, exactly at cap
    
    // Test just above cap threshold
    const aboveCap = classifyRetry(11, 15);
    assert.equal(aboveCap.delayMs, 5000); // 11 * 500 = 5500, capped at 5000
  });

  test('should handle concurrent operations independently', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let operation1Count = 0;
    let operation2Count = 0;
    
    const operation1 = async (attempt: number) => {
      operation1Count++;
      if (operation1Count < 2) {
        throw new Error(`Operation 1 attempt ${operation1Count}`);
      }
      return 'operation-1-success';
    };
    
    const operation2 = async (attempt: number) => {
      operation2Count++;
      if (operation2Count < 3) {
        throw new Error(`Operation 2 attempt ${operation2Count}`);
      }
      return 'operation-2-success';
    };
    
    // Run operations concurrently
    const [result1, result2] = await Promise.all([
      withRetry(5, operation1),
      withRetry(5, operation2)
    ]);
    
    assert.equal(result1, 'operation-1-success');
    assert.equal(result2, 'operation-2-success');
    assert.equal(operation1Count, 2);
    assert.equal(operation2Count, 3);
  });

  test('should handle operation that returns Promise rejection', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let attemptCount = 0;
    const promiseRejectingOperation = async (attempt: number) => {
      attemptCount++;
      if (attempt < 2) {
        return Promise.reject(new Error(`Promise rejected on attempt ${attempt}`));
      }
      return Promise.resolve('success');
    };
    
    const result = await withRetry(3, promiseRejectingOperation);
    
    assert.equal(result, 'success');
    assert.equal(attemptCount, 2);
  });

  test('should handle very fast operations', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let callCount = 0;
    const fastOperation = async (attempt: number) => {
      callCount++;
      // Immediate success
      return 'fast-result';
    };
    
    const result = await withRetry(5, fastOperation);
    
    assert.equal(result, 'fast-result');
    assert.equal(callCount, 1);
  });

  test('should handle operation that throws different errors', async () => {
    const { withRetry } = await import('../src/index.js');
    
    let attemptCount = 0;
    const varyingErrorOperation = async (attempt: number) => {
      attemptCount++;
      if (attempt === 1) {
        throw new Error('First error type');
      } else if (attempt === 2) {
        throw new TypeError('Second error type');
      }
      return 'success';
    };
    
    const result = await withRetry(3, varyingErrorOperation);
    
    assert.equal(result, 'success');
    assert.equal(attemptCount, 3);
    
    // Should preserve the last error if it fails
    const failingVaryingOperation = async (attempt: number) => {
      if (attempt === 1) {
        throw new Error('First error');
      } else if (attempt === 2) {
        throw new TypeError('Second error');
      }
      throw new Error('Third error');
    };
    
    try {
      await withRetry(2, failingVaryingOperation);
      assert.fail('Should have thrown error');
    } catch (error: any) {
      assert.ok(error instanceof Error);
      // Should preserve the last error (attempt 2)
      assert.ok(error.message.includes('Second error'));
      assert.equal(error.constructor.name, 'TypeError'); // Should preserve original error type
    }
  });
});
