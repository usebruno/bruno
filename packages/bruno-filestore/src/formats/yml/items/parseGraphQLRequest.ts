import type { Item as BrunoItem, HttpItemSettings as BrunoHttpItemSettings } from '@usebruno/schema-types/collection/item';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { GraphQLRequest, GraphQLRequestSettings, GraphQLBody } from '@opencollection/types/requests/graphql';
import { toBrunoAuth } from '../common/auth';
import { toBrunoHttpHeaders } from '../common/headers';
import { toBrunoParams } from '../common/params';
import { toBrunoVariables } from '../common/variables';
import { toBrunoScripts } from '../common/scripts';
import { toBrunoAssertions } from '../common/assertions';
import { uuid } from '../../../utils';

const parseGraphQLRequest = (ocRequest: GraphQLRequest): BrunoItem => {
  const brunoRequest: BrunoHttpRequest = {
    url: ocRequest.url || '',
    method: ocRequest.method || 'POST',
    headers: toBrunoHttpHeaders(ocRequest.headers) || [],
    params: toBrunoParams(ocRequest.params) || [],
    auth: toBrunoAuth(ocRequest.auth),
    body: {
      mode: 'graphql',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: {
        query: (ocRequest.body as GraphQLBody)?.query || null,
        variables: (ocRequest.body as GraphQLBody)?.variables || null
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
  const scripts = toBrunoScripts(ocRequest.scripts);
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

  // variables
  const variables = toBrunoVariables(ocRequest.variables);
  brunoRequest.vars = variables;

  // assertions
  const assertions = toBrunoAssertions(ocRequest.assertions);
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
    seq: ocRequest.seq || 1,
    name: ocRequest.name || 'Untitled Request',
    tags: ocRequest.tags || [],
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
