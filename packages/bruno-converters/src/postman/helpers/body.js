import mime from 'mime-types';
import { uuid } from '../../common';
import { ensureString } from './values';
import { toBrunoFormUrlEncoded, toBrunoMultipartForm } from './key-values';

export const emptyBody = () => ({
  mode: 'none',
  json: null,
  text: null,
  xml: null,
  formUrlEncoded: [],
  multipartForm: [],
  file: []
});

// Postman's file body has no content type; unknown extensions fall back to application/octet-stream (RFC 2046 §4.5.1).
const inferBinaryContentType = (filePath) => mime.lookup(filePath || '') || 'application/octet-stream';

// Bruno has no html or javascript body modes, so they import as text.
export const toBrunoRawBody = (language, content) => {
  if (language === 'json') return { ...emptyBody(), mode: 'json', json: content };
  if (language === 'xml') return { ...emptyBody(), mode: 'xml', xml: content };
  return { ...emptyBody(), mode: 'text', text: content };
};

export const toBrunoMultipartBody = (fields) => ({
  ...emptyBody(),
  mode: 'multipartForm',
  multipartForm: toBrunoMultipartForm(fields)
});

export const toBrunoFormUrlEncodedBody = (fields) => ({
  ...emptyBody(),
  mode: 'formUrlEncoded',
  formUrlEncoded: toBrunoFormUrlEncoded(fields)
});

export const toBrunoFileBody = (src) => {
  const filePath = ensureString(src);
  return {
    ...emptyBody(),
    mode: 'file',
    file: [{
      uid: uuid(),
      selected: true,
      filePath,
      contentType: inferBinaryContentType(filePath)
    }]
  };
};
