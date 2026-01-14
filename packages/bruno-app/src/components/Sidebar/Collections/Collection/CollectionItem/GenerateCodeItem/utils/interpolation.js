import { interpolate } from '@usebruno/common';
import { cloneDeep } from 'lodash-es';

export const interpolateAuth = (auth, variables = {}) => {
  if (!auth) return auth;
  return JSON.parse(interpolate(JSON.stringify(auth), variables));
};

export const interpolateHeaders = (headers = [], variables = {}) => {
  return headers.map((header) => ({
    ...header,
    name: interpolate(header.name, variables),
    value: interpolate(header.value, variables)
  }));
};

export const interpolateBody = (body, variables = {}) => {
  if (!body) return null;

  const interpolatedBody = cloneDeep(body);

  switch (body.mode) {
    case 'json':
      let parsed = body.json;
      // If it's already a string, use it directly; if it's an object, stringify it first
      if (typeof parsed === 'object') {
        parsed = JSON.stringify(parsed);
      }
      parsed = interpolate(parsed, variables, { escapeJSONStrings: true });
      try {
        const jsonObj = JSON.parse(parsed);
        interpolatedBody.json = JSON.stringify(jsonObj, null, 2);
      } catch {
        interpolatedBody.json = parsed;
      }
      break;

    case 'text':
      interpolatedBody.text = interpolate(body.text, variables);
      break;

    case 'xml':
      interpolatedBody.xml = interpolate(body.xml, variables);
      break;

    case 'sparql':
      interpolatedBody.sparql = interpolate(body.sparql, variables);
      break;

    case 'formUrlEncoded':
      interpolatedBody.formUrlEncoded = Array.isArray(body.formUrlEncoded)
        ? body.formUrlEncoded.map((param) => ({
            ...param,
            value: param.enabled ? interpolate(param.value, variables) : param.value
          }))
        : [];
      break;

    case 'multipartForm':
      interpolatedBody.multipartForm = Array.isArray(body.multipartForm)
        ? body.multipartForm.map((param) => ({
            ...param,
            value:
              param.type === 'text' && param.enabled
                ? interpolate(param.value, variables)
                : param.value
          }))
        : [];
      break;

    default:
      break;
  }

  return interpolatedBody;
};

export const interpolateParams = (params = [], variables = {}) => {
  return params.map((param) => ({
    ...param,
    name: interpolate(param.name, variables),
    value: param.enabled ? interpolate(param.value, variables) : param.value
  }));
};
