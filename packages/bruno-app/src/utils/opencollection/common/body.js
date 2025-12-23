import { uuid } from 'utils/common';

export const toBrunoBody = (body, requestType = 'http') => {
  if (!body) {
    return { mode: 'none' };
  }

  if (requestType === 'graphql') {
    return {
      mode: 'graphql',
      graphql: {
        query: body.query || '',
        variables: body.variables || ''
      }
    };
  }

  switch (body.type) {
    case 'json':
      return { mode: 'json', json: body.data || '' };
    case 'text':
      return { mode: 'text', text: body.data || '' };
    case 'xml':
      return { mode: 'xml', xml: body.data || '' };
    case 'sparql':
      return { mode: 'sparql', sparql: body.data || '' };
    case 'form-urlencoded':
      return {
        mode: 'formUrlEncoded',
        formUrlEncoded: (body.data || []).map((field) => ({
          uid: uuid(),
          name: field.name || '',
          value: field.value || '',
          description: field.description || '',
          enabled: field.disabled !== true
        }))
      };
    case 'multipart-form':
      return {
        mode: 'multipartForm',
        multipartForm: (body.data || []).map((field) => ({
          uid: uuid(),
          name: field.name || '',
          type: field.type || 'text',
          value: field.value || '',
          description: field.description || '',
          enabled: field.disabled !== true
        }))
      };
    case 'file':
      return {
        mode: 'file',
        file: (body.data || []).map((file) => ({
          uid: uuid(),
          filePath: file.filePath || '',
          contentType: file.contentType || '',
          selected: file.selected !== false
        }))
      };
    default:
      return { mode: 'none' };
  }
};

export const toOpenCollectionBody = (body) => {
  if (!body || body.mode === 'none') return undefined;

  switch (body.mode) {
    case 'json':
      return { type: 'json', data: body.json || '' };
    case 'text':
      return { type: 'text', data: body.text || '' };
    case 'xml':
      return { type: 'xml', data: body.xml || '' };
    case 'sparql':
      return { type: 'sparql', data: body.sparql || '' };
    case 'formUrlEncoded':
      return {
        type: 'form-urlencoded',
        data: (body.formUrlEncoded || []).map((field) => ({
          name: field.name || '',
          value: field.value || '',
          ...(field.description && { description: field.description }),
          ...(field.enabled === false && { disabled: true })
        }))
      };
    case 'multipartForm':
      return {
        type: 'multipart-form',
        data: (body.multipartForm || []).map((field) => ({
          name: field.name || '',
          type: field.type || 'text',
          value: field.value || '',
          ...(field.description && { description: field.description }),
          ...(field.enabled === false && { disabled: true })
        }))
      };
    case 'file':
      return {
        type: 'file',
        data: (body.file || []).map((file) => ({
          filePath: file.filePath || '',
          contentType: file.contentType || '',
          selected: file.selected !== false
        }))
      };
    case 'graphql':
      return {
        query: body.graphql?.query || '',
        variables: body.graphql?.variables || ''
      };
    default:
      return undefined;
  }
};
