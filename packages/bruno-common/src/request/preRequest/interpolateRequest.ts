import { RequestContext } from '../types';
import interpolate from '../../interpolate';
import { parse, stringify } from 'lossless-json';

function interpolateAuth(context: RequestContext, combinedVars: Record<string, unknown>) {
  const auth = context.requestItem.request.auth;

  switch (auth.mode) {
    case 'none':
    case 'inherit':
      break;
    case 'basic':
      auth.basic.username = interpolate(auth.basic.username, combinedVars);
      auth.basic.password = interpolate(auth.basic.password, combinedVars);
      break;
    case 'bearer':
      auth.bearer.token = interpolate(auth.bearer.token, combinedVars);
      break;
    case 'digest':
      auth.digest.username = interpolate(auth.digest.username, combinedVars);
      auth.digest.password = interpolate(auth.digest.password, combinedVars);
      break;
    case 'awsv4':
      auth.awsv4.accessKeyId = interpolate(auth.awsv4.accessKeyId, combinedVars);
      auth.awsv4.region = interpolate(auth.awsv4.region, combinedVars);
      auth.awsv4.profileName = interpolate(auth.awsv4.profileName, combinedVars);
      auth.awsv4.service = interpolate(auth.awsv4.service, combinedVars);
      auth.awsv4.sessionToken = interpolate(auth.awsv4.sessionToken, combinedVars);
      auth.awsv4.secretAccessKey = interpolate(auth.awsv4.secretAccessKey, combinedVars);
      break;
  }
}

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
      break;
    case 'formUrlEncoded':
      for (const item of context.requestItem.request.body.formUrlEncoded) {
        item.value = interpolate(item.value, combinedVars);
        item.name = interpolate(item.name, combinedVars);
      }
      break;
    case 'xml':
      context.requestItem.request.body.xml = interpolate(context.requestItem.request.body.xml, combinedVars);
      break;
    case 'sparql':
      context.requestItem.request.body.sparql = interpolate(context.requestItem.request.body.sparql, combinedVars);
      break;
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
  interpolateAuth(context, combinedVars);

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
