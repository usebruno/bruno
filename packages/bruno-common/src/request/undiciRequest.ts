import { RequestContext } from './types';
import { Client } from 'undici';
import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const DELETE_ME_RESPONSE_CACHE_PATH = 'C:\\Users\\Timon\\AppData\\Roaming\\bruno-lazer\\responseCache';

function parseEncodingFromResponseHeaders(headers: Record<string, string | string[] | undefined>): BufferEncoding {
  const encodingHeaders = headers['content-type'];
  if (!encodingHeaders) {
    return 'utf-8';
  }
  const headerValue = Array.isArray(encodingHeaders) ? encodingHeaders[0] ?? '' : encodingHeaders;
  const charset = /charset=([^()<>@,;:"/[\]?.=\s]*)/i.exec(headerValue);

  // TODO: Check if the encoding is valid / usable by node
  // @ts-ignore
  return charset?.at(1) ?? 'utf-8';
}

export async function undiciRequest(context: RequestContext) {
  // TODO: Handle redirects in a way that allow to collect all headers
  // TODO: Pass timeout here
  // TODO: Proxy and CA-Cert config
  const client = new Client(context.requestItem.request.url);

  const targetPath = join(DELETE_ME_RESPONSE_CACHE_PATH, context.requestItem.uid);
  await rm(targetPath, { force: true });

  if (!context.undiciRequest) {
    throw new Error('undiciRequest is not set, but should be at this point');
  }
  await client.stream(context.undiciRequest, ({ headers, statusCode }) => {
    const encoding = parseEncodingFromResponseHeaders(headers);

    context.response = {
      headers,
      statusCode,
      encoding
    };

    return createWriteStream(targetPath, { autoClose: true, encoding });
  });

  await client.close();
}
