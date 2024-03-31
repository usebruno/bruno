import { platform, arch } from 'node:os';
import { RequestBody, RequestContext, RequestItem } from '../types';
import { FormData } from 'undici';
import { stringify } from 'lossless-json';
import { URL } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Blob } from 'node:buffer';
import qs from 'qs';

const bodyContentTypeMap: Record<RequestBody['mode'], string | null> = {
  multipartForm: null, // Undici will automatically create the correct header with the FormData object
  formUrlEncoded: 'application/x-www-form-urlencoded',
  json: 'application/json',
  xml: 'text/xml',
  text: 'text/plain',
  sparql: 'application/sparql-query',
  none: null
};

type HeaderMetadata = {
  brunoVersion: string;
  isCli: boolean;
  undiciVersion: string;
};

export function createDefaultRequestHeader(requestItem: RequestItem, meta: HeaderMetadata): Record<string, string> {
  return {
    'user-agent': `Bruno/${meta.brunoVersion} (${
      meta.isCli ? 'CLI' : 'Electron'
    }; Lazer; ${platform()}/${arch()}) undici/${meta.undiciVersion}`,
    accept: '*/*',
    'content-type': bodyContentTypeMap[requestItem.request.body.mode]!
  };
}

function getRequestHeaders(context: RequestContext): Record<string, string> {
  const defaultHeader = createDefaultRequestHeader(context.requestItem, {
    isCli: false,
    undiciVersion: '6.10.1',
    brunoVersion: '1.12.3'
  });

  const headers = context.requestItem.request.headers.reduce<Record<string, string>>((acc, header) => {
    if (header.enabled) {
      acc[header.name.toLowerCase()] = header.value;
    }
    return acc;
  }, defaultHeader);

  context.debug.log('requestHeaders', headers);

  return headers;
}

async function getRequestBody(context: RequestContext): Promise<string | null | FormData> {
  switch (context.requestItem.request.body.mode) {
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
            break;
        }
      }
      return formData;
    case 'formUrlEncoded':
      const combined = context.requestItem.request.body.formUrlEncoded.reduce<Record<string, string>>((acc, item) => {
        if (item.enabled) {
          acc[item.name] = item.value;
        }
        return acc;
      }, {});
      return qs.stringify(combined);
    case 'json':
      if (typeof context.requestItem.request.body.json !== 'string') {
        return stringify(context.requestItem.request.body.json) ?? '';
      }
      return context.requestItem.request.body.json;
    case 'xml':
      return context.requestItem.request.body.xml;
    case 'text':
      return context.requestItem.request.body.text;
    case 'sparql':
      return context.requestItem.request.body.sparql;
    case 'none':
      return null;
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
      headers: getRequestHeaders(context),
      body: await getRequestBody(context)
    }
  };
}
