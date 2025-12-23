import type {
  Scripts,
  BrunoScript,
  BrunoHttpRequest
} from '../types';

interface ScriptsResult {
  script: BrunoScript;
  tests: string | null;
}

export const fromOpenCollectionScripts = (scripts: Scripts | undefined): ScriptsResult => {
  const result: ScriptsResult = {
    script: { req: null, res: null },
    tests: null
  };

  if (!scripts?.length) {
    return result;
  }

  for (const script of scripts) {
    switch (script.type) {
      case 'before-request':
        result.script.req = script.code || null;
        break;
      case 'after-response':
        result.script.res = script.code || null;
        break;
      case 'tests':
        result.tests = script.code || null;
        break;
    }
  }

  return result;
};

interface BrunoRequest {
  script?: BrunoScript | null;
  tests?: string | null;
}

export const toOpenCollectionScripts = (request: BrunoRequest | null | undefined): Scripts | undefined => {
  if (!request) {
    return undefined;
  }

  const scripts: Scripts = [];

  if (request.script?.req) {
    scripts.push({ type: 'before-request', code: request.script.req });
  }

  if (request.script?.res) {
    scripts.push({ type: 'after-response', code: request.script.res });
  }

  if (request.tests) {
    scripts.push({ type: 'tests', code: request.tests });
  }

  return scripts.length > 0 ? scripts : undefined;
};
