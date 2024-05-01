import { platform, arch } from 'node:os';
import { BrunoConfig, RequestBody, RequestContext, RequestItem } from '../types';
import { stringify } from 'lossless-json';
import { URL } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import qs from 'qs';
import FormData from 'form-data';
import { Agent } from 'node:http';
import { ProxyAgent } from 'proxy-agent';
import BodyReadable from 'undici/types/readable';

function createAuthHeader(requestItem: RequestItem): Record<string, string> {
  const auth = requestItem.request.auth;

  switch (auth.mode) {
    case 'basic':
      const credentials = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64');
      return {
        authorization: `Basic ${credentials}`
      };
    case 'bearer':
      return {
        authorization: `Bearer ${auth.bearer.token}`
      };
    default:
      return {};
  }
}

const bodyContentTypeMap: Record<RequestBody['mode'], string | undefined> = {
  multipartForm: undefined,
  formUrlEncoded: 'application/x-www-form-urlencoded',
  json: 'application/json',
  xml: 'text/xml',
  text: 'text/plain',
  sparql: 'application/sparql-query',
  none: undefined
};

type HeaderMetadata = {
  brunoVersion: string;
  isCli: boolean;
};

export function createDefaultRequestHeader(requestItem: RequestItem, meta: HeaderMetadata): Record<string, string> {
  const defaultHeaders: Record<string, string> = {
    'user-agent': `Bruno/${meta.brunoVersion} (${meta.isCli ? 'CLI' : 'Electron'}; Lazer; ${platform()}/${arch()})`,
    accept: '*/*',
    ...createAuthHeader(requestItem)
  };
  const contentType = bodyContentTypeMap[requestItem.request.body.mode]!;
  if (contentType) {
    defaultHeaders['content-type'] = contentType;
  }

  return defaultHeaders;
}

function getRequestHeaders(context: RequestContext, extraHeaders: Record<string, string>): Record<string, string> {
  const defaultHeader = createDefaultRequestHeader(context.requestItem, {
    isCli: false,
    brunoVersion: '1.14.0'
  });

  // Go through user header and merge them together with default header
  const headers = context.requestItem.request.headers.reduce<Record<string, string>>(
    (acc, header) => {
      if (header.enabled) {
        acc[header.name.toLowerCase()] = header.value;
      }
      return acc;
    },
    { ...defaultHeader, ...extraHeaders }
  );

  context.debug.log('Request headers', headers);

  return headers;
}

async function getRequestBody(context: RequestContext): Promise<[string | Buffer | undefined, Record<string, string>]> {
  let bodyData;
  let extraHeaders: Record<string, string> = {};

  const body = context.requestItem.request.body;
  switch (body.mode) {
    case 'multipartForm':
      const formData = new FormData();
      for (const item of body.multipartForm) {
        if (!item.enabled) {
          continue;
        }
        switch (item.type) {
          case 'text':
            formData.append(item.name, item.value);
            break;
          case 'file':
            const fileData = await fs.readFile(item.value[0]!);
            formData.append(item.name, fileData, path.basename(item.value[0]!));
            break;
        }
      }

      bodyData = formData.getBuffer();
      extraHeaders = formData.getHeaders();
      break;
    case 'formUrlEncoded':
      const combined = body.formUrlEncoded.reduce<Record<string, string[]>>((acc, item) => {
        if (item.enabled) {
          if (!acc[item.name]) {
            acc[item.name] = [];
          }
          acc[item.name].push(item.value);
        }
        return acc;
      }, {});

      bodyData = qs.stringify(combined, { arrayFormat: 'repeat' });
      break;
    case 'json':
      if (typeof body.json !== 'string') {
        bodyData = stringify(body.json) ?? '';
        break;
      }
      bodyData = body.json;
      break;
    case 'xml':
      bodyData = body.xml;
      break;
    case 'text':
      bodyData = body.text;
      break;
    case 'sparql':
      bodyData = body.sparql;
      break;
    case 'none':
      bodyData = undefined;
      break;
    default:
      // @ts-expect-error body.mode is `never` here because the case should never happen
      throw new Error(`No case defined for body mode: "${body.mode}"`);
  }

  return [bodyData, extraHeaders];
}

function createClientCertOptions(certConfig: Exclude<BrunoConfig['clientCertificates'], undefined>, host: string) {
  for (const { domain, certFilePath, keyFilePath, passphrase } of certConfig.certs) {
    // Check if the Certificate was created for the current host
    const hostRegex = '^https:\\/\\/' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
    if (!host.match(hostRegex)) {
      continue;
    }
  }
}

const protocolMap: Record<Exclude<BrunoConfig['proxy'], undefined>['protocol'], string> = {
  http: 'http:',
  https: 'https:',
  socks4: 'socks:',
  socks5: 'socks:'
};

function createProxyAgent(
  proxyConfig: Exclude<BrunoConfig['proxy'], undefined>,
  host: string,
  signal?: AbortSignal
): Agent | null {
  if (proxyConfig.enabled === false) {
    return null;
  }

  const mustByPass = proxyConfig.bypassProxy.split(';').some((byPass) => byPass === '*' || byPass === host);
  if (mustByPass) {
    return null;
  }

  return new ProxyAgent({
    protocol: protocolMap[proxyConfig.protocol],
    hostname: proxyConfig.hostname,
    port: !proxyConfig.port ? undefined : proxyConfig.port, // Port could be 0 / NaN
    auth: proxyConfig.auth.enabled ? `${proxyConfig.auth.username}:${proxyConfig.auth.password}` : undefined,
    signal
  });
}

export async function createHttpRequest(context: RequestContext) {
  let urlObject;
  try {
    urlObject = new URL(context.requestItem.request.url);
  } catch (error) {
    throw new Error(`Could not your URL: "${context.requestItem.request.url}". Original error: ${error}`);
  }

  const [body, extraHeaders] = await getRequestBody(context);
  context.httpRequest = {
    redirectDepth: 0,
    body,
    options: {
      method: context.requestItem.request.method,
      protocol: urlObject.protocol,
      host: urlObject.host,
      port: urlObject.port,
      path: `${urlObject.pathname}${urlObject.search}${urlObject.hash}`,
      headers: getRequestHeaders(context, extraHeaders)
    }
  };

  if (context.collection.brunoConfig.proxy) {
    const agent = createProxyAgent(
      context.collection.brunoConfig.proxy,
      urlObject.host,
      context.abortController?.signal
    );
    if (agent) {
      context.httpRequest.options.agent = agent;
    }
  }

  context.callback.folderRequestSent(context);
}
