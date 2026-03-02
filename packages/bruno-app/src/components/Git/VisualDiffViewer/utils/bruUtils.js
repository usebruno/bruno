import get from 'lodash/get';

export const getBodyContent = (body) => {
  if (!body) return '';
  if (body.json) return body.json;
  if (body.text) return body.text;
  if (body.xml) return body.xml;
  if (body.sparql) return body.sparql;
  if (body.graphql?.query) return body.graphql.query;
  if (body.content) return body.content;
  return '';
};

export const getBodyMode = (body) => {
  if (!body) return 'none';
  if (body.json !== undefined) return 'json';
  if (body.text !== undefined) return 'text';
  if (body.xml !== undefined) return 'xml';
  if (body.sparql !== undefined) return 'sparql';
  if (body.graphql) return 'graphql';
  if (body.formUrlEncoded) return 'formUrlEncoded';
  if (body.multipartForm) return 'multipartForm';
  if (body.file) return 'file';
  if (body.grpc) return 'grpc';
  if (body.ws) return 'ws';
  if (body.mode === 'none') return 'none';
  return 'none';
};

export const getMethod = (data) => {
  return get(data, 'request.method', 'GET');
};

export const getUrl = (data) => {
  return get(data, 'request.url', '');
};

export const computeItemDiffStatus = (currentItem, otherItem, showSide) => {
  if (!otherItem) {
    return showSide === 'old' ? 'deleted' : 'added';
  }
  if (currentItem.value !== otherItem.value || currentItem.enabled !== otherItem.enabled) {
    return 'modified';
  }
  return 'unchanged';
};
