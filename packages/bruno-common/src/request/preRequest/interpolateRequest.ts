import { RequestContext } from '../types';
import interpolate from '../../interpolate';
import { parse, stringify } from 'lossless-json';

function interpolateBody(context: RequestContext, combinedVars: Record<string, unknown>) {
  switch (context.requestItem.request.body.mode) {
    case 'text':
      context.requestItem.request.body.text = interpolate(context.requestItem.request.body.text, combinedVars);
      break;
    case 'json':
      if (typeof context.requestItem.request.body.json === 'object') {
        context.requestItem.request.body.json = stringify(context.requestItem.request.body.json)!;
      }
      context.requestItem.request.body.json = interpolate(context.requestItem.request.body.json, combinedVars);
      try {
        // @ts-ignore
        context.requestItem.request.body.json = parse(context.requestItem.request.body.json);
      } catch {}
      break;
    case 'multipartForm':
      for (const item of context.requestItem.request.body.multipartForm) {
        if (item.type === 'text') {
          item.value = interpolate(item.value, combinedVars);
        }
        item.name = interpolate(item.name, combinedVars);
      }
  }
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
