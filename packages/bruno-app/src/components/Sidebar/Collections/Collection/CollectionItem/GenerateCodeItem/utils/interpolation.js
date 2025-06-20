import { interpolate } from '@usebruno/common';
import { cloneDeep } from 'lodash';

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
      if (body.json) {
        try {
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
        } catch (e) {
          console.error('JSON interpolation error:', e);
          interpolatedBody.json = body.json;
        }
      }
      break;

    case 'text':
      if (body.text) {
        interpolatedBody.text = interpolate(body.text, variables);
      }
      break;

    case 'xml':
      if (body.xml) {
        interpolatedBody.xml = interpolate(body.xml, variables);
      }
      break;

    case 'sparql':
      if (body.sparql) {
        interpolatedBody.sparql = interpolate(body.sparql, variables);
      }
      break;

    case 'formUrlEncoded':
      if (Array.isArray(body.formUrlEncoded)) {
        interpolatedBody.formUrlEncoded = body.formUrlEncoded.map((param) => ({
          ...param,
          value: param.enabled ? interpolate(param.value, variables) : param.value
        }));
      }
      break;

    case 'multipartForm':
      if (Array.isArray(body.multipartForm)) {
        interpolatedBody.multipartForm = body.multipartForm.map((param) => ({
          ...param,
          value:
            param.type === 'text' && param.enabled
              ? interpolate(param.value, variables)
              : param.value
        }));
      }
      break;

    default:
      break;
  }

  return interpolatedBody;
};

export const createVariablesObject = ({
  globalEnvironmentVariables = {},
  collectionVars = {},
  allVariables = {},
  collection = {},
  runtimeVariables = {},
  processEnvVars = {}
}) => {
  return {
    ...globalEnvironmentVariables,
    ...allVariables,
    ...collectionVars,
    ...runtimeVariables,
    process: {
      env: {
        ...processEnvVars
      }
    }
  };
}; 