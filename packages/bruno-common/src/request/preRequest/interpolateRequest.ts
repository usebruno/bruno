import { RequestContext } from '../types';
import interpolate from '../../interpolate';
import { parse, stringify } from 'lossless-json';

// This is wrapper/shorthand for the original `interpolate` function.
// The `name` parameter is used for debugLogging
type InterpolationShorthandFunction = (target: string, name: string) => string;

function interpolateBrunoConfigOptions(context: RequestContext, i: InterpolationShorthandFunction) {
  const brunoConfig = context.collection.brunoConfig;

  if (brunoConfig.clientCertificates?.certs) {
    for (const cert of brunoConfig.clientCertificates?.certs) {
      cert.certFilePath = i(cert.certFilePath, 'Certificate CertFilePath');
      cert.keyFilePath = i(cert.keyFilePath, 'Certificate KeyFilePath');
      cert.domain = i(cert.domain, 'Certificate domain');
      cert.passphrase = i(cert.passphrase, 'Certificate passphrase');
    }
  }

  if (brunoConfig.proxy) {
    // @ts-expect-error User need to make sure this is correct. `createHttpRequest` will throw an erro when this is not correct
    brunoConfig.proxy.protocol = i(brunoConfig.proxy.protocol, 'Proxy protocol');
    brunoConfig.proxy.hostname = i(brunoConfig.proxy.hostname, 'Proxy hostname');
    brunoConfig.proxy.port = Number(i(String(brunoConfig.proxy.port), 'Proxy port'));
    if (brunoConfig.proxy.auth?.enabled) {
      brunoConfig.proxy.auth.username = i(brunoConfig.proxy.auth.username, 'Proxy username');
      brunoConfig.proxy.auth.password = (brunoConfig.proxy.auth.password, 'Proxy password');
    }
  }
}

function interpolateRequestItem(context: RequestContext, i: InterpolationShorthandFunction) {
  const request = context.requestItem.request;

  request.url = i(request.url, 'Request url');

  let pos = 0;
  for (const header of request.headers) {
    pos++;
    header.name = i(header.name, `Header name #${pos}`);
    header.value = i(header.value, `Header value #${pos}`);
  }
}

function interpolateAuth(context: RequestContext, i: InterpolationShorthandFunction) {
  const auth = context.requestItem.request.auth;

  switch (auth.mode) {
    case 'none':
    case 'inherit':
      break;
    case 'basic':
      auth.basic.username = i(auth.basic.username, 'Basic auth username');
      auth.basic.password = i(auth.basic.password, 'Basic auth password');
      break;
    case 'bearer':
      auth.bearer.token = i(auth.bearer.token, 'Bearer token');
      break;
    case 'digest':
      auth.digest.username = i(auth.digest.username, 'Digest auth usernaem');
      auth.digest.password = i(auth.digest.password, 'Digest auth password');
      break;
    case 'awsv4':
      auth.awsv4.accessKeyId = i(auth.awsv4.accessKeyId, 'AWS auth AccessKeyId');
      auth.awsv4.region = i(auth.awsv4.region, 'AWS auth Region');
      auth.awsv4.profileName = i(auth.awsv4.profileName, 'AWS auth ProfileName');
      auth.awsv4.service = i(auth.awsv4.service, 'AWS auth Service');
      auth.awsv4.sessionToken = i(auth.awsv4.sessionToken, 'AWS auth SessionToken');
      auth.awsv4.secretAccessKey = i(auth.awsv4.secretAccessKey, 'AWS auth SecretAccessKey');
      break;
  }
}

function interpolateBody(context: RequestContext, i: InterpolationShorthandFunction) {
  const body = context.requestItem.request.body;
  switch (body.mode) {
    case 'text':
      body.text = i(body.text, '');
      break;
    case 'json':
      if (typeof body.json === 'object') {
        body.json = stringify(body.json)!;
      }
      body.json = i(body.json, 'Json body');
      try {
        // @ts-ignore
        body.json = parse(body.json);
      } catch {}
      break;
    case 'multipartForm': {
      let pos = 0;
      for (const item of body.multipartForm) {
        pos++;
        if (item.type === 'text') {
          item.value = i(item.value, `Multipart form value #${pos}`);
        }
        item.name = i(item.name, `Multipart form name #${pos}`);
      }
      break;
    }
    case 'formUrlEncoded': {
      let pos = 0;
      for (const item of body.formUrlEncoded) {
        pos++;
        item.value = i(item.value, `Form field value #${pos}`);
        item.name = i(item.name, `Form field name #${pos}`);
      }
      break;
    }
    case 'xml':
      body.xml = i(body.xml, 'XML body');
      break;
    case 'sparql':
      body.sparql = i(body.sparql, 'SPARQL body');
      break;
    case 'graphql':
      body.graphql.query = i(body.graphql.query, 'GraphQL query');
      body.graphql.variables = i(body.graphql.variables, 'GraphQL variables');
      break;
  }
}

export function interpolateRequest(context: RequestContext) {
  const combinedVars: Record<string, unknown> = {
    ...context.variables.environment,
    ...context.variables.collection,
    ...context.variables.process
  };

  const interpolationResults: Record<string, { before: string; after: string }> = {};
  const interpolateShorthand: InterpolationShorthandFunction = (before, name) => {
    const after = interpolate(before, combinedVars);
    // Only log when something has changed
    if (before !== after) {
      interpolationResults[name] = { before, after };
    }
    return after;
  };

  interpolateRequestItem(context, interpolateShorthand);
  interpolateBody(context, interpolateShorthand);
  interpolateAuth(context, interpolateShorthand);
  interpolateBrunoConfigOptions(context, interpolateShorthand);

  context.debug.log('Interpolated request', interpolationResults);
}
