import { setTimeout } from 'node:timers/promises';

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  reason: string;
}

export function classifyRetry(attempt: number, maxAttempts: number): RetryDecision {
  if (attempt >= maxAttempts) {
    return { shouldRetry: false, delayMs: 0, reason: 'retry_budget_exhausted' };
  }

  return {
    shouldRetry: true,
    delayMs: Math.min(5000, attempt * 500),
    reason: attempt === 1 ? 'initial_retry' : 'transient_candidate',
  };
}

export async function withRetry<T>(
  maxAttempts: number,
  operation: (attempt: number) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let currentAttempt = 1; currentAttempt <= maxAttempts; currentAttempt += 1) {
    try {
      return await operation(currentAttempt);
    } catch (error) {
      lastError = error;
      const decision = classifyRetry(currentAttempt, maxAttempts);
      if (!decision.shouldRetry) {
        break;
      }
      await setTimeout(decision.delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
