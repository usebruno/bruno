import type { Item as BrunoItem, HttpItemSettings as BrunoHttpItemSettings } from '@usebruno/schema-types/collection/item';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { GraphQLRequest, GraphQLRequestSettings, GraphQLBody } from '@opencollection/types/requests/graphql';
import { toBrunoAuth } from '../common/auth';
import { toBrunoHttpHeaders } from '../common/headers';
import { toBrunoParams } from '../common/params';
import { toBrunoVariables } from '../common/variables';
import { toBrunoPostResponseVariables } from '../common/actions';
import { toBrunoScripts } from '../common/scripts';
import { toBrunoAssertions } from '../common/assertions';
import { uuid, ensureString } from '../../../utils';

const parseGraphQLRequest = (ocRequest: GraphQLRequest): BrunoItem => {
  const info = ocRequest.info;
  const graphql = ocRequest.graphql;
  const runtime = ocRequest.runtime;

  const brunoRequest: BrunoHttpRequest = {
    url: ensureString(graphql?.url),
    method: ensureString(graphql?.method, 'POST'),
    headers: toBrunoHttpHeaders(graphql?.headers) || [],
    params: toBrunoParams(graphql?.params) || [],
    auth: toBrunoAuth(graphql?.auth),
    body: {
      mode: 'graphql',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: {
        query: (graphql?.body as GraphQLBody)?.query || '',
        variables: (graphql?.body as GraphQLBody)?.variables || ''
      },
      file: []
    },
    script: {
      req: null,
      res: null
    },
    vars: {
      req: [],
      res: []
    },
    assertions: [],
    tests: null,
    docs: null
  };

  // scripts
  const scripts = toBrunoScripts(runtime?.scripts);
  if (scripts?.script && brunoRequest.script) {
    if (scripts.script.req) {
      brunoRequest.script.req = scripts.script.req;
    }
    if (scripts.script.res) {
      brunoRequest.script.res = scripts.script.res;
    }
  }
  if (scripts?.tests) {
    brunoRequest.tests = scripts.tests;
  }

  // variables (pre-request from variables, post-response from actions)
  const variables = toBrunoVariables(runtime?.variables);
  const postResponseVars = toBrunoPostResponseVariables(runtime?.actions);
  brunoRequest.vars = {
    req: variables.req,
    res: postResponseVars
  };

  // assertions
  const assertions = toBrunoAssertions(runtime?.assertions);
  if (assertions) {
    brunoRequest.assertions = assertions;
  }

  // docs
  if (ocRequest.docs) {
    brunoRequest.docs = ocRequest.docs;
  }

  // bruno item
  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'graphql-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: brunoRequest,
    settings: null,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  // settings
  if (ocRequest.settings) {
    const settings: BrunoHttpItemSettings = {};

    if (typeof ocRequest.settings.encodeUrl === 'boolean') {
      settings.encodeUrl = ocRequest.settings.encodeUrl;
    } else {
      settings.encodeUrl = true;
    }

    if (typeof ocRequest.settings.timeout === 'number') {
      settings.timeout = ocRequest.settings.timeout;
    } else if (ocRequest.settings.timeout === 'inherit') {
      settings.timeout = 'inherit';
    } else {
      settings.timeout = 0;
    }

    if (typeof ocRequest.settings.followRedirects === 'boolean') {
      settings.followRedirects = ocRequest.settings.followRedirects;
    } else {
      settings.followRedirects = true;
    }

    if (typeof ocRequest.settings.maxRedirects === 'number') {
      settings.maxRedirects = ocRequest.settings.maxRedirects;
    } else {
      settings.maxRedirects = 5;
    }

    brunoItem.settings = settings;
  }

  return brunoItem;
};

export default parseGraphQLRequest;
