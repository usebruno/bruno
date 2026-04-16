import { interpolate, interpolateObject } from '@usebruno/common';
import { each } from 'lodash';
import { flattenItems, getAllVariables, isItemARequest } from 'utils/collections';
import { interpolateUrl, interpolateUrlPathParams } from 'utils/url';

const REDACTED_VALUE = '[REDACTED]';

const interpolateString = (value, variables, options = {}) => {
  if (typeof value !== 'string') {
    return value;
  }

  return interpolate(value, variables, options);
};

const interpolateJsonValue = (value, variables, options = {}) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  try {
    const interpolated = interpolateString(JSON.stringify(value), variables, options);
    return JSON.parse(interpolated);
  } catch (error) {
    return value;
  }
};

const createSafeDocumentationVariables = (variables = {}) => {
  const safeVariables = {
    ...variables
  };

  // Documentation should not resolve process.env values from the local machine.
  delete safeVariables.process;

  // Do not expose secret env/global variable values in generated docs.
  const maskedNames = Array.isArray(variables.maskedEnvVariables)
    ? variables.maskedEnvVariables
    : [];

  maskedNames.forEach((name) => {
    safeVariables[name] = REDACTED_VALUE;
  });

  delete safeVariables.maskedEnvVariables;

  return safeVariables;
};

const interpolateEntries = (entries = [], variables = {}) => {
  if (!Array.isArray(entries)) {
    return entries;
  }

  return entries.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      return entry;
    }

    return {
      ...entry,
      name: interpolateString(entry.name, variables),
      value: Array.isArray(entry.value)
        ? entry.value.map((value) => interpolateString(value, variables))
        : interpolateString(entry.value, variables)
    };
  });
};

const interpolateWsMessages = (messages = [], variables = {}) => {
  if (!Array.isArray(messages)) {
    return messages;
  }

  return messages.map((message) => {
    if (!message || typeof message !== 'object') {
      return message;
    }

    let escapeJSONStrings = message?.type === 'json';

    if (!escapeJSONStrings && typeof message?.content === 'string') {
      try {
        JSON.parse(message.content);
        escapeJSONStrings = true;
      } catch (error) {
        // no-op, plain text payload
      }
    }

    return {
      ...message,
      name: interpolateString(message.name, variables),
      content: interpolateString(message.content, variables, { escapeJSONStrings })
    };
  });
};

const interpolateRequestBody = (body, variables = {}) => {
  if (!body || typeof body !== 'object') {
    return;
  }

  switch (body.mode) {
    case 'json':
      body.json = interpolateString(body.json, variables, { escapeJSONStrings: true });
      break;
    case 'text':
      body.text = interpolateString(body.text, variables);
      break;
    case 'xml':
      body.xml = interpolateString(body.xml, variables);
      break;
    case 'graphql':
      if (typeof body.graphql === 'string') {
        body.graphql = interpolateString(body.graphql, variables, { escapeJSONStrings: true });
      } else if (body.graphql && typeof body.graphql === 'object') {
        body.graphql.query = interpolateString(body.graphql.query, variables, { escapeJSONStrings: true });

        if (typeof body.graphql.variables === 'string') {
          body.graphql.variables = interpolateString(body.graphql.variables, variables, { escapeJSONStrings: true });
        } else {
          body.graphql.variables = interpolateJsonValue(body.graphql.variables, variables, { escapeJSONStrings: true });
        }
      }
      break;
    case 'sparql':
      body.sparql = interpolateString(body.sparql, variables);
      break;
    case 'formUrlEncoded':
      body.formUrlEncoded = interpolateEntries(body.formUrlEncoded, variables);
      break;
    case 'multipartForm':
      body.multipartForm = Array.isArray(body.multipartForm)
        ? body.multipartForm.map((entry) => {
            if (!entry || typeof entry !== 'object') {
              return entry;
            }

            if (entry.type && entry.type !== 'text') {
              return entry;
            }

            return {
              ...entry,
              name: interpolateString(entry.name, variables),
              value: interpolateString(entry.value, variables)
            };
          })
        : body.multipartForm;
      break;
    case 'grpc':
      body.grpc = Array.isArray(body.grpc)
        ? body.grpc.map((message) => ({
            ...message,
            name: interpolateString(message?.name, variables),
            content: interpolateString(message?.content, variables, { escapeJSONStrings: true })
          }))
        : body.grpc;
      break;
    case 'ws':
      body.ws = interpolateWsMessages(body.ws, variables);
      break;
    default:
      break;
  }
};

const resolveRequestForHtmlDocumentation = (request, variables = {}) => {
  if (!request || typeof request !== 'object') {
    return;
  }

  const interpolatedUrl = interpolateUrl({
    url: request.url,
    variables
  }) || request.url;
  const hasPathParams = Array.isArray(request.params)
    ? request.params.some((param) => param?.type === 'path' && param?.enabled !== false)
    : false;
  const hasNonHttpProtocol = /^(ws|wss|grpc|grpcs):\/\//i.test(interpolatedUrl || '');

  request.url = hasPathParams && !hasNonHttpProtocol
    ? interpolateUrlPathParams(interpolatedUrl, request.params || [], variables, { raw: true })
    : interpolatedUrl;
  request.headers = interpolateEntries(request.headers, variables);
  request.params = interpolateEntries(request.params, variables);

  if (request.auth && typeof request.auth === 'object') {
    request.auth = interpolateObject(request.auth, variables);
  }

  if (request.body) {
    interpolateRequestBody(request.body, variables);
  }

  request.docs = interpolateString(request.docs, variables);
};

export const resolveCollectionForHtmlDocumentation = (collection) => {
  if (!collection?.items?.length) {
    return collection;
  }

  const items = flattenItems(collection.items);

  each(items, (item) => {
    if (!isItemARequest(item) || item.isTransient) {
      return;
    }

    const variables = createSafeDocumentationVariables(getAllVariables(collection, item));

    resolveRequestForHtmlDocumentation(item.request, variables);

    if (Array.isArray(item.examples)) {
      each(item.examples, (example) => {
        resolveRequestForHtmlDocumentation(example?.request, variables);
      });
    }
  });

  return collection;
};
