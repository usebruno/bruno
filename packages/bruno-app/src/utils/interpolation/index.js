import { interpolate } from '@usebruno/common';

export const interpolateString = (str, variables = {}, options = {}) => {
  if (!str || typeof str !== 'string') {
    return str;
  }

  return interpolate(str, variables, options);
};

export const interpolateHeaders = (headers = [], variables = {}) => {
  return headers.map(header => ({
    ...header,
    name: interpolateString(header.name, variables),
    value: interpolateString(header.value, variables)
  }));
};

export const interpolateBody = (body, variables = {}) => {
  if (!body) return null;

  const interpolatedBody = { ...body };

  switch (body.mode) {
    case 'json':
      if (body.json) {
        try {
          const interpolatedRawJson = interpolateString(body.json, variables);

          try {
            const jsonObj = JSON.parse(interpolatedRawJson);
            interpolatedBody.json = JSON.stringify(jsonObj, null, 2);
          } catch {
            interpolatedBody.json = interpolatedRawJson;
          }
        } catch (e) {
          console.error('JSON interpolation error:', e);
          interpolatedBody.json = body.json;
        }
      }
      break;

    case 'text':
      if (body.text) {
        interpolatedBody.text = interpolateString(body.text, variables);
      }
      break;

    case 'xml':
      if (body.xml) {
        interpolatedBody.xml = interpolateString(body.xml, variables);
      }
      break;

    case 'sparql':
      if (body.sparql) {
        interpolatedBody.sparql = interpolateString(body.sparql, variables);
      }
      break;

    case 'formUrlEncoded':
      if (Array.isArray(body.formUrlEncoded)) {
        interpolatedBody.formUrlEncoded = body.formUrlEncoded.map(param => ({
          ...param,
          value: param.enabled ? interpolateString(param.value, variables) : param.value
        }));
      }
      break;

    case 'multipartForm':
      if (Array.isArray(body.multipartForm)) {
        interpolatedBody.multipartForm = body.multipartForm.map(param => ({
          ...param,
          value: param.type === 'text' && param.enabled
            ? interpolateString(param.value, variables)
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