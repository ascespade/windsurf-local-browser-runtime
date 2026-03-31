import type {
  BrowserActionTarget,
  BrowserClickInput,
  BrowserTypeInput,
} from '@wlbr/protocol';
import { rankTarget } from '@wlbr/selector-engine';

export interface PlannedBrowserAction {
  kind: 'click' | 'type' | 'wait' | 'scroll' | 'hover';
  target: BrowserActionTarget;
  selector: string;
  jsResolver: string;
  confidence: number;
  payload?: string;
  timeoutMs: number;
}

function highestRanked(target: BrowserActionTarget) {
  const ranked = rankTarget(target)[0];
  if (!ranked) {
    throw new Error(`No selector candidates available for target strategy=${target.strategy}`);
  }
  return ranked;
}

export function planClick(input: BrowserClickInput): PlannedBrowserAction {
  const ranked = highestRanked(input.target);
  return {
    kind: 'click',
    target: input.target,
    selector: ranked.selector,
    jsResolver: ranked.jsResolver,
    confidence: ranked.confidence,
    timeoutMs: input.timeoutMs ?? 10000,
  };
}

export function planType(input: BrowserTypeInput): PlannedBrowserAction {
  const ranked = highestRanked(input.target);
  return {
    kind: 'type',
    target: input.target,
    selector: ranked.selector,
    jsResolver: ranked.jsResolver,
    confidence: ranked.confidence,
    payload: input.value,
    timeoutMs: input.timeoutMs ?? 10000,
  };
}

export function planWait(target: BrowserActionTarget, timeoutMs = 10000): PlannedBrowserAction {
  const ranked = highestRanked(target);
  return {
    kind: 'wait',
    target,
    selector: ranked.selector,
    jsResolver: ranked.jsResolver,
    confidence: ranked.confidence,
    timeoutMs,
  };
}

export function planScroll(target: BrowserActionTarget, direction: 'up' | 'down' | 'left' | 'right' = 'down', amount = 300): PlannedBrowserAction {
  const ranked = highestRanked(target);
  return {
    kind: 'scroll',
    target,
    selector: ranked.selector,
    jsResolver: ranked.jsResolver,
    confidence: ranked.confidence,
    payload: JSON.stringify({ direction, amount }),
    timeoutMs: 5000,
  };
}

export function planHover(target: BrowserActionTarget): PlannedBrowserAction {
  const ranked = highestRanked(target);
  return {
    kind: 'hover',
    target,
    selector: ranked.selector,
    jsResolver: ranked.jsResolver,
    confidence: ranked.confidence,
    timeoutMs: 5000,
  };
}
