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

export const interpolateUrl = ({ url, variables }) => {
  if (!url || !url.length || typeof url !== 'string') {
    return;
  }

  return interpolate(url, variables);
};

export const interpolateUrlPathParams = (url, params) => {
  const getInterpolatedBasePath = (pathname, params) => {
    return pathname
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          const pathParamName = segment.slice(1);
          const pathParam = params.find((p) => p?.name === pathParamName && p?.type === 'path');
          return pathParam ? pathParam.value : segment;
        }
        return segment;
      })
      .join('/');
  };

  let uri;

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }

  try {
    uri = new URL(url);
  } catch (error) {
    // if the URL is invalid, return the URL as is
    return url;
  }

  const basePath = getInterpolatedBasePath(uri.pathname, params);

  return `${uri.origin}${basePath}${uri?.search || ''}`;
};