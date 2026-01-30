import type { Item as BrunoItem, HttpItemSettings as BrunoHttpItemSettings } from '@usebruno/schema-types/collection/item';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { GraphQLRequest, GraphQLRequestSettings, GraphQLBody, GraphQLRequestInfo, GraphQLRequestDetails, GraphQLRequestRuntime } from '@opencollection/types/requests/graphql';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { Assertion } from '@opencollection/types/common/assertions';
import type { Action } from '@opencollection/types/common/actions';
import type { HttpRequestParam, HttpRequestHeader } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { isNonEmptyString, isNumber } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';
import { toOpenCollectionParams } from '../common/params';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionActions } from '../common/actions';
import { toOpenCollectionScripts } from '../common/scripts';
import { toOpenCollectionAssertions } from '../common/assertions';

const stringifyGraphQLRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: GraphQLRequest = {};
    const brunoRequest = item.request as BrunoHttpRequest;

    // info block
    const info: GraphQLRequestInfo = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'graphql'
    };
    if (item.seq) {
      info.seq = item.seq;
    }
    if (item.tags?.length) {
      info.tags = item.tags;
    }
    ocRequest.info = info;

    // graphql block
    const graphql: GraphQLRequestDetails = {
      method: isNonEmptyString(brunoRequest.method) ? brunoRequest.method : 'POST',
      url: isNonEmptyString(brunoRequest.url) ? brunoRequest.url : ''
    };

    // headers
    const headers: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) {
      graphql.headers = headers;
    }

    // params
    const params: HttpRequestParam[] | undefined = toOpenCollectionParams(brunoRequest.params);
    if (params) {
      graphql.params = params;
    }

    // body
    if (brunoRequest.body?.mode === 'graphql' && brunoRequest.body.graphql) {
      const graphqlBody: GraphQLBody = {};
      let hasBody = false;

      if (isNonEmptyString(brunoRequest.body.graphql.query)) {
        graphqlBody.query = brunoRequest.body.graphql.query;
        hasBody = true;
      }

      if (isNonEmptyString(brunoRequest.body.graphql.variables)) {
        graphqlBody.variables = brunoRequest.body.graphql.variables;
        hasBody = true;
      }

      if (hasBody) {
        graphql.body = graphqlBody;
      }
    }

    // auth (in graphql block, not runtime)
    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      graphql.auth = auth;
    }

    ocRequest.graphql = graphql;

    // runtime block
    const runtime: GraphQLRequestRuntime = {};
    let hasRuntime = false;

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      runtime.scripts = scripts;
      hasRuntime = true;
    }

    // assertions
    const assertions: Assertion[] | undefined = toOpenCollectionAssertions(brunoRequest.assertions);
    if (assertions) {
      runtime.assertions = assertions;
      hasRuntime = true;
    }

    // actions (from post-response variables)
    const resVars = brunoRequest.vars?.res;
    const actions: Action[] | undefined = toOpenCollectionActions(resVars);
    if (actions) {
      runtime.actions = actions;
      hasRuntime = true;
    }

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    // settings
    const httpSettings = item.settings as BrunoHttpItemSettings | undefined;
    const settings: GraphQLRequestSettings = {};
    if (httpSettings?.encodeUrl === true) {
      settings.encodeUrl = true;
    } else if (httpSettings?.encodeUrl === false) {
      settings.encodeUrl = false;
    } else {
      settings.encodeUrl = true;
    }

    const timeout = httpSettings?.timeout;
    if (isNumber(timeout)) {
      settings.timeout = timeout;
    } else {
      settings.timeout = 0;
    }

    if (httpSettings?.followRedirects === true) {
      settings.followRedirects = true;
    } else if (httpSettings?.followRedirects === false) {
      settings.followRedirects = false;
    } else {
      settings.followRedirects = true;
    }

    const maxRedirects = httpSettings?.maxRedirects;
    if (isNumber(maxRedirects)) {
      settings.maxRedirects = maxRedirects;
    } else {
      settings.maxRedirects = 5;
    }

    ocRequest.settings = settings;

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying GraphQL request:', error);
    throw error;
  }
};

export default stringifyGraphQLRequest;
