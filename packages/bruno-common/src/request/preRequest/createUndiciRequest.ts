import { platform, arch } from 'node:os';
import { RequestContext } from '../types';
import { FormData } from 'undici';
import { stringify } from 'lossless-json';
import { Readable } from 'stream';

function getRequestHeaders(context: RequestContext): Record<string, string> {
  const headers = context.requestItem.request.headers.reduce<Record<string, string>>((acc, header) => {
    if (header.enabled) {
      acc[header.name.toLowerCase()] = header.value;
    }
    return acc;
  }, {});

  context.debug.log('requestHeaders', headers);

  return headers;
}

function getRequestBody(context: RequestContext): string | Buffer | Uint8Array | Readable | null | FormData {
  // TODO: All body mode cases
  switch (context.requestItem.request.body.mode) {
    case 'none':
      return null;
    case 'json':
      if (typeof context.requestItem.request.data !== 'string') {
        return stringify(context.requestItem.request.data) ?? '';
      }
      return context.requestItem.request.data;
    default:
      throw new Error(`No case defined for body mode: "${context.requestItem.request.body.mode}"`);
  }
}

export function createUndiciRequest(context: RequestContext) {
  context.undiciRequest = {
    method: context.requestItem.request.method,
    path: '/',
    headers: {
      'user-agent': `Bruno/1.12.3 (Lazer; ${platform()}/${arch()}) undici/6.10.1`,
      accept: '*/*',
      ...getRequestHeaders(context)
    },
    body: getRequestBody(context)
  };
}
