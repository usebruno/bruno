import { platform, arch } from 'node:os';
import { RequestContext } from '../types';
import { FormData } from 'undici';
import { stringify } from 'lossless-json';
import { URL } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Blob } from 'node:buffer';

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

async function getRequestBody(context: RequestContext): Promise<string | null | FormData> {
  // TODO: All body mode cases
  switch (context.requestItem.request.body.mode) {
    case 'none':
      return null;
    case 'json':
      if (typeof context.requestItem.request.body.json !== 'string') {
        return stringify(context.requestItem.request.body.json) ?? '';
      }
      return context.requestItem.request.body.json;
    case 'text':
      return context.requestItem.request.body.text;
    case 'multipartForm':
      const formData = new FormData();
      for (const item of context.requestItem.request.body.multipartForm) {
        if (!item.enabled) {
          continue;
        }
        switch (item.type) {
          case 'text':
            formData.append(item.name, item.value);
            break;
          case 'file':
            const fileData = await fs.readFile(item.value[0]!);
            formData.append(item.name, new Blob([fileData]), path.basename(item.value[0]!));
        }
      }
      return formData;
    default:
      // @ts-expect-error body.mode is `never` here because the case should never happen
      throw new Error(`No case defined for body mode: "${context.requestItem.request.body.mode}"`);
  }
}

export async function createUndiciRequest(context: RequestContext) {
  const urlObject = new URL(context.requestItem.request.url);

  context.undiciRequest = {
    url: urlObject.origin,
    options: {
      method: context.requestItem.request.method,
      path: `${urlObject.pathname}${urlObject.search}${urlObject.hash}`,
      maxRedirections: 0, // Don't follow redirects
      headers: {
        'user-agent': `Bruno/1.12.3 (Lazer; ${platform()}/${arch()}) undici/6.10.1`,
        accept: '*/*',
        ...getRequestHeaders(context)
      },
      body: await getRequestBody(context)
    }
  };
}
