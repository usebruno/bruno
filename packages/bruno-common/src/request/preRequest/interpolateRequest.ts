import { RequestContext } from '../types';
import interpolate from '../../interpolate';
import { parse, stringify } from 'lossless-json';

function interpolateBody(context: RequestContext, combinedVars: Record<string, unknown>) {
  const preInterpolation = structuredClone(context.requestItem.request.data);
  const bodyType = typeof context.requestItem.request.data;

  switch (typeof context.requestItem.request.data) {
    case 'string':
      context.requestItem.request.data = interpolate(context.requestItem.request.data, combinedVars);
      break;
    case 'object':
      // TODO: Check what happens to files in multipart form
      const asString = stringify(context.requestItem.request.data) ?? '';
      context.requestItem.request.data = interpolate(asString, combinedVars);
      try {
        context.requestItem.request.data = parse(context.requestItem.request.data as string);
      } catch (error) {
        // A users JSON body is allowed to fail, because its user input.
        // Everything else like Multipart form should fail here
        if (context.requestItem.request.body.mode !== 'json') {
          throw new Error(`Failed to parse interpolated body: "${error}"`);
        }
      }
      break;
  }

  context.debug.log('interpolateBody', {
    preInterpolation,
    pastInterpolation: context.requestItem.request.data,
    bodyType,
    mode: context.requestItem.request.body.mode
  });
}

export function interpolateRequest(context: RequestContext) {
  const combinedVars: Record<string, unknown> = {
    ...context.variables.environment,
    ...context.variables.collection,
    ...context.variables.process
  };
  const request = context.requestItem.request;

  request.url = interpolate(request.url, combinedVars);

  for (const header of request.headers) {
    header.name = interpolate(header.name, combinedVars);
    header.value = interpolate(header.value, combinedVars);
  }

  interpolateBody(context, combinedVars);

  const proxy = context.collection.brunoConfig.proxy;
  if (proxy) {
    // @ts-expect-error
    proxy.protocol = interpolate(proxy.protocol, combinedVars);
    proxy.hostname = interpolate(proxy.hostname, combinedVars);
    proxy.port = Number(interpolate(String(proxy.port), combinedVars));

    if (proxy.auth && proxy.auth.enabled) {
      proxy.auth.username = interpolate(proxy.auth.username, combinedVars);
      proxy.auth.password = interpolate(proxy.auth.password, combinedVars);
    }
  }

  // TODO: Find out how the auth is saved in the request
}
