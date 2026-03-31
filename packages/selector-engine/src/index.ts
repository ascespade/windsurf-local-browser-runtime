import type { BrowserActionTarget } from '@wlbr/protocol';

export interface RankedSelector {
  selector: string;
  confidence: number;
  source: BrowserActionTarget['strategy'];
  jsResolver: string;
}

function escapeJsString(value: string): string {
  return JSON.stringify(value);
}

export function rankTarget(target: BrowserActionTarget): RankedSelector[] {
  const testIdAttribute = target.testIdAttribute ?? 'data-testid';

  switch (target.strategy) {
    case 'testId': {
      return [
        {
          selector: `[${testIdAttribute}="${target.value}"]`,
          confidence: 1,
          source: 'testId',
          jsResolver: `(() => document.querySelector(${escapeJsString(`[${testIdAttribute}="${target.value}"]`)}))()`,
        },
      ];
    }
    case 'role': {
      const value = escapeJsString(target.value);
      const role = escapeJsString(target.role ?? 'button');
      return [
        {
          selector: `[role="${target.role ?? 'button'}"]`,
          confidence: 0.9,
          source: 'role',
          jsResolver: `
            (() => {
              const roleValue = ${role};
              const nameValue = ${value}.toLowerCase();
              const all = [...document.querySelectorAll('[role]')];
              return all.find((node) =>
                node.getAttribute('role') === roleValue &&
                (node.textContent ?? '').trim().toLowerCase().includes(nameValue)
              ) ?? null;
            })()
          `.trim(),
        },
      ];
    }
    case 'label': {
      const value = escapeJsString(target.value);
      return [
        {
          selector: `label:${target.value}`,
          confidence: 0.85,
          source: 'label',
          jsResolver: `
            (() => {
              const text = ${value}.toLowerCase();
              const labels = [...document.querySelectorAll('label')];
              const label = labels.find((item) => (item.textContent ?? '').trim().toLowerCase().includes(text));
              if (!label) return null;
              if (label instanceof HTMLLabelElement && label.control) return label.control;
              const forId = label.getAttribute('for');
              return forId ? document.getElementById(forId) : label.querySelector('input,textarea,select,button');
            })()
          `.trim(),
        },
      ];
    }
    case 'css':
      return [
        {
          selector: target.value,
          confidence: 0.75,
          source: 'css',
          jsResolver: `(() => document.querySelector(${escapeJsString(target.value)}))()`,
        },
      ];
    case 'text': {
      const value = escapeJsString(target.value);
      return [
        {
          selector: `text=${target.value}`,
          confidence: 0.65,
          source: 'text',
          jsResolver: `
            (() => {
              const targetText = ${value}.toLowerCase();
              const all = [...document.querySelectorAll('body *')];
              return all.find((node) => (node.textContent ?? '').trim().toLowerCase().includes(targetText)) ?? null;
            })()
          `.trim(),
        },
      ];
    }
  }
}
