import type { Item as BrunoItem, HttpItemSettings as BrunoHttpItemSettings } from '@usebruno/schema-types/collection/item';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { GraphQLRequest, GraphQLRequestSettings, GraphQLBody } from '@opencollection/types/requests/graphql';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { Assertion } from '@opencollection/types/common/assertions';
import type { HttpRequestParam, HttpHeader } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { isNonEmptyString, isNumber } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';
import { toOpenCollectionParams } from '../common/params';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';
import { toOpenCollectionAssertions } from '../common/assertions';

const stringifyGraphQLRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: GraphQLRequest = {
      type: 'graphql'
    };

    ocRequest.name = isNonEmptyString(item.name) ? item.name : 'Untitled Request';

    // sequence
    if (item.seq) {
      ocRequest.seq = item.seq;
    }

    const brunoRequest = item.request as BrunoHttpRequest;
    // url and method
    ocRequest.url = isNonEmptyString(brunoRequest.url) ? brunoRequest.url : '';
    ocRequest.method = isNonEmptyString(brunoRequest.method) ? brunoRequest.method : 'POST';

    // headers
    const headers: HttpHeader[] | undefined = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) {
      ocRequest.headers = headers;
    }

    // params
    const params: HttpRequestParam[] | undefined = toOpenCollectionParams(brunoRequest.params);
    if (params) {
      ocRequest.params = params;
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
        ocRequest.body = graphqlBody;
      }
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      ocRequest.auth = auth;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      ocRequest.scripts = scripts;
    }

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      ocRequest.variables = variables;
    }

    // assertions
    const assertions: Assertion[] | undefined = toOpenCollectionAssertions(brunoRequest.assertions);
    if (assertions) {
      ocRequest.assertions = assertions;
    }

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    // settings
    const httpSettings = item.settings as BrunoHttpItemSettings | undefined;
    ocRequest.settings = {} as GraphQLRequestSettings;
    if (httpSettings?.encodeUrl === true) {
      ocRequest.settings.encodeUrl = true;
    } else if (httpSettings?.encodeUrl === false) {
      ocRequest.settings.encodeUrl = false;
    } else {
      // todo: we are defaulting to true for now as bruno config does not yet support inherit for encodeUrl
      // update this when bruno config supports inherit for encodeUrl
      ocRequest.settings.encodeUrl = true;
    }

    const timeout = httpSettings?.timeout;
    if (isNumber(timeout)) {
      ocRequest.settings.timeout = timeout;
    } else {
      // todo: we are defaulting to 0 for now as bruno config does not yet support inherit for timeout
      // update this when bruno config supports inherit for timeout
      ocRequest.settings.timeout = 0;
    }

    if (httpSettings?.followRedirects === true) {
      ocRequest.settings.followRedirects = true;
    } else if (httpSettings?.followRedirects === false) {
      ocRequest.settings.followRedirects = false;
    } else {
      // todo: we are defaulting to true for now as bruno config does not yet support inherit for followRedirects
      // update this when bruno config supports inherit for followRedirects
      ocRequest.settings.followRedirects = true;
    }

    const maxRedirects = httpSettings?.maxRedirects;
    if (isNumber(maxRedirects)) {
      ocRequest.settings.maxRedirects = maxRedirects;
    } else {
      // todo: we are defaulting to 5 for now as bruno config does not yet support inherit for maxRedirects
      // update this when bruno config supports inherit for maxRedirects
      ocRequest.settings.maxRedirects = 5;
    }

    // tags
    if (item.tags?.length) {
      ocRequest.tags = item.tags;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying GraphQL request:', error);
    throw error;
  }
};

export default stringifyGraphQLRequest;
