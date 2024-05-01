import { RequestOptions } from 'http';
import { RequestContext } from '../types';
import { handleDigestAuth } from './digestAuth';
import { addAwsAuthHeader } from './awsSig4vAuth';
import { HttpRequestInfo, execHttpRequest } from './httpRequest';
import { Timeline } from '../Timeline';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function makeHttpRequest(context: RequestContext) {
  if (context.timeline === undefined) {
    context.timeline = new Timeline();
  }

  const body = context.httpRequest?.body;
  let requestOptions = context.httpRequest!.options;

  while (true) {
    addMandatoryHeader(requestOptions, body);
    if (context.requestItem.request.auth.mode === 'awsv4') {
      addAwsAuthHeader(context.requestItem.request.auth, requestOptions, body);
    }

    // Deference the original options
    context.debug.log('Request', {
      options: {
        ...requestOptions,
        agent: undefined
      }
    });
    console.log(context.abortController);
    const response = await execHttpRequest(requestOptions, body, context.abortController?.signal);

    const nextRequest = await handleServerResponse(context, requestOptions, response);
    context.timeline?.add(response);
    if (nextRequest === false) {
      await handleFinalResponse(response, context);
      break;
    }

    requestOptions = nextRequest;
  }
}

function addMandatoryHeader(requestOptions: RequestOptions, body?: string | Buffer) {
  let hostHeader = requestOptions.host!;
  if (requestOptions.port) {
    hostHeader = `:${requestOptions.port}`;
  }
  requestOptions.headers!['host'] = hostHeader;

  if (body !== undefined) {
    const length = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
    requestOptions.headers!['content-length'] = String(length);
  }
}

async function handleServerResponse(
  context: RequestContext,
  request: RequestOptions,
  response: HttpRequestInfo
): Promise<RequestOptions | false> {
  // We did not get a response / an error occurred
  if (response.statusCode === undefined) {
    return false;
  }

  const mustRedirect = handleRedirect(request, response);
  if (mustRedirect) {
    // Use the users redirect limit or default to 25
    const redirectLimit = context.requestItem.request.maxRedirects ?? 25;
    if (context.httpRequest!.redirectDepth > redirectLimit) {
      response.info = 'Server returned redirect, but redirect limit is reached';
      return false;
    }

    response.info = 'Server returned redirect';
    return request;
  }

  const digestAuthContinue = handleDigestAuth(
    response.statusCode!,
    response.headers!,
    request,
    context.requestItem.request.auth
  );
  if (digestAuthContinue) {
    response.info = 'Server returned DigestAuth details';
    return request;
  }

  response.info = 'Final response';
  return false;
}

// This is basically copied from: https://github.com/nodejs/undici/blob/main/lib/handler/redirect-handler.js#L91
function handleRedirect(request: RequestOptions, response: HttpRequestInfo): boolean {
  // Should only be counted with one of these status codes
  if (response.statusCode === undefined || ![300, 301, 302, 303, 307, 308].includes(response.statusCode)) {
    return false;
  }

  // Check if we got a Location header
  const newLocation = Array.isArray(response.headers!) ? response.headers![0] : response.headers!['location'];
  if (!newLocation) {
    return false;
  }

  // This will first build the Original request URL and then merge it with the location header.
  // URL will automatically handle a relative Location header e.g. /new-site or an absolute location
  // e.g. https://my-new-site.net
  let newLocationUrl;
  try {
    newLocationUrl = new URL(newLocation, new URL(request.path!, `${request.protocol}//${request.hostname}`));
  } catch (error) {
    throw new Error(
      'Could not create Url to redirect location! Server returned this location: ' +
        `"${newLocation}", old path: "${request.path}" & old base: "${request.protocol}//${request.hostname}". ` +
        `Original error: ${error}`
    );
  }
  request.hostname = newLocationUrl.hostname;
  request.protocol = newLocationUrl.protocol;
  request.path = `${newLocationUrl.pathname}${newLocationUrl.search}`;

  return true;
}

async function handleFinalResponse(response: HttpRequestInfo, context: RequestContext) {
  if (response.error || response.statusCode === undefined) {
    throw new Error(response.error || 'Server did not return a response');
  }

  const targetPath = join(context.dataDir, context.requestItem.uid);
  await writeFile(targetPath, response.responseBody!);

  context.response = {
    encoding: 'utf-8',
    path: targetPath,
    headers: response.headers!,
    responseTime: response.responseTime!,
    statusCode: response.statusCode
  };
}
