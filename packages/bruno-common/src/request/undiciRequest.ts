import { RequestContext } from './types';
import { stream } from 'undici';
import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Timeline } from './Timeline';
import { URL } from 'node:url';
import os from 'node:os';

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

// This is basically copied from: https://github.com/nodejs/undici/blob/main/lib/handler/redirect-handler.js#L91
function mustRedirect(
  statusCode: number,
  headers: Record<string, string | string[] | undefined>,
  originalHost: string,
  originalPath: string
): false | [string, string] {
  if (![300, 301, 302, 303, 307, 308].includes(statusCode)) {
    return false;
  }

  const newLocation = Array.isArray(headers['location']) ? headers['location'][0] : headers['location'];
  if (!newLocation) {
    return false;
  }

  // This will first build the Original request URL and then merge it with the location header.
  // URL will automatically handle a relative Location header e.g. /new-site or a absolute location
  // e.g. https://my-new-site.net
  const newLocationUrl = new URL(newLocation, new URL(originalPath, originalHost));
  return [newLocationUrl.origin, `${newLocationUrl.pathname}${newLocationUrl.search}`];
}

async function doRequest(
  undiciRequest: Exclude<RequestContext['undiciRequest'], undefined>,
  targetPath: string,
  timeline: Timeline
): Promise<RequestContext['response']> {
  return new Promise(async (resolve, reject) => {
    await stream(undiciRequest.url, undiciRequest.options, ({ headers, statusCode }) => {
      // TODO: Handle max redirects options
      const redirect = mustRedirect(statusCode, headers, undiciRequest.url, undiciRequest.options.path);

      timeline.add({
        // @ts-expect-error Set by us in createUndiciRequest
        requestHeaders: undiciRequest.options.headers,
        responseHeader: headers,
        statusCode,
        info: redirect ? 'Server returned redirect' : 'Final response'
      });

      if (redirect) {
        const newRequest = structuredClone(undiciRequest);
        newRequest.url = redirect[0];
        newRequest.options.path = redirect[1];
        doRequest(newRequest, targetPath, timeline).then(resolve).catch(reject);
        // TODO: In the future we could write the start of the response into the timeline
        // Write this response to /dev/null
        return createWriteStream(os.devNull);
      }

      const encoding = parseEncodingFromResponseHeaders(headers);

      resolve({
        headers,
        statusCode,
        encoding,
        path: targetPath
      });

      return createWriteStream(targetPath, { autoClose: true, encoding });
    });
  });
}

export async function undiciRequest(context: RequestContext) {
  // TODO: Handle redirects in a way that allow to collect all headers
  // TODO: Pass timeout here
  // TODO: Proxy and CA-Cert config
  const targetPath = join(DELETE_ME_RESPONSE_CACHE_PATH, context.requestItem.uid);
  await rm(targetPath, { force: true });

  context.responseTimeline = new Timeline();

  if (!context.undiciRequest) {
    throw new Error('undiciRequest is not set, but should be at this point');
  }
  context.response = await doRequest(context.undiciRequest, targetPath, context.responseTimeline);
}
