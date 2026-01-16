import { uuid } from '../../common/index.js';
import type {
  HttpRequestBody,
  RawBody,
  FormUrlEncodedBody,
  FormUrlEncodedEntry,
  MultipartFormBody,
  MultipartFormEntry,
  FileBody,
  FileBodyVariant,
  GraphQLBody,
  BrunoHttpRequestBody,
  BrunoKeyValue,
  BrunoMultipartFormEntry,
  BrunoFileEntry,
  BrunoGraphqlBody
} from '../types';

export const fromOpenCollectionBody = (body: HttpRequestBody | GraphQLBody | undefined, requestType: string = 'http'): BrunoHttpRequestBody => {
  const defaultBody: BrunoHttpRequestBody = {
    mode: 'none',
    json: null,
    text: null,
    xml: null,
    sparql: null,
    formUrlEncoded: [],
    multipartForm: [],
    graphql: null,
    file: []
  };

  if (!body) {
    return defaultBody;
  }

  if (requestType === 'graphql') {
    const gqlBody = body as GraphQLBody;
    return {
      ...defaultBody,
      mode: 'graphql',
      graphql: {
        query: gqlBody.query || '',
        variables: gqlBody.variables || ''
      }
    };
  }

  const httpBody = body as HttpRequestBody;

  if ('type' in httpBody) {
    switch (httpBody.type) {
      case 'json': {
        const rawBody = httpBody as RawBody;
        return {
          ...defaultBody,
          mode: 'json',
          json: rawBody.data || ''
        };
      }

      case 'text': {
        const rawBody = httpBody as RawBody;
        return {
          ...defaultBody,
          mode: 'text',
          text: rawBody.data || ''
        };
      }

      case 'xml': {
        const rawBody = httpBody as RawBody;
        return {
          ...defaultBody,
          mode: 'xml',
          xml: rawBody.data || ''
        };
      }

      case 'sparql': {
        const rawBody = httpBody as RawBody;
        return {
          ...defaultBody,
          mode: 'sparql',
          sparql: rawBody.data || ''
        };
      }

      case 'form-urlencoded': {
        const formBody = httpBody as FormUrlEncodedBody;
        return {
          ...defaultBody,
          mode: 'formUrlEncoded',
          formUrlEncoded: (formBody.data || []).map((field): BrunoKeyValue => ({
            uid: uuid(),
            name: field.name || '',
            value: field.value || '',
            description: typeof field.description === 'string' ? field.description : field.description?.content || null,
            enabled: field.disabled !== true
          }))
        };
      }

      case 'multipart-form': {
        const multipartBody = httpBody as MultipartFormBody;
        return {
          ...defaultBody,
          mode: 'multipartForm',
          multipartForm: (multipartBody.data || []).map((field): BrunoMultipartFormEntry => ({
            uid: uuid(),
            type: field.type || 'text',
            name: field.name || '',
            value: Array.isArray(field.value) ? field.value : (field.value || ''),
            description: typeof field.description === 'string' ? field.description : field.description?.content || null,
            contentType: null,
            enabled: field.disabled !== true
          }))
        };
      }

      case 'file': {
        const fileBody = httpBody as FileBody;
        return {
          ...defaultBody,
          mode: 'file',
          file: (fileBody.data || []).map((file): BrunoFileEntry => ({
            uid: uuid(),
            filePath: file.filePath || '',
            contentType: file.contentType || '',
            selected: file.selected !== false
          }))
        };
      }
    }
  }

  return defaultBody;
};

export const toOpenCollectionBody = (body: BrunoHttpRequestBody | null | undefined): HttpRequestBody | undefined => {
  if (!body || body.mode === 'none') {
    return undefined;
  }

  switch (body.mode) {
    case 'json':
      return { type: 'json', data: body.json || '' };

    case 'text':
      return { type: 'text', data: body.text || '' };

    case 'xml':
      return { type: 'xml', data: body.xml || '' };

    case 'sparql':
      return { type: 'sparql', data: body.sparql || '' };

    case 'formUrlEncoded': {
      const formData: FormUrlEncodedEntry[] = (body.formUrlEncoded || []).map((field): FormUrlEncodedEntry => {
        const entry: FormUrlEncodedEntry = {
          name: field.name || '',
          value: field.value || ''
        };

        if (field.description && typeof field.description === 'string' && field.description.trim().length) {
          entry.description = field.description;
        }

        if (field.enabled === false) {
          entry.disabled = true;
        }

        return entry;
      });

      return { type: 'form-urlencoded', data: formData };
    }

    case 'multipartForm': {
      const multipartData: MultipartFormEntry[] = (body.multipartForm || []).map((field): MultipartFormEntry => {
        const entry: MultipartFormEntry = {
          name: field.name || '',
          type: field.type || 'text',
          value: field.value || ''
        };

        if (field.description && typeof field.description === 'string' && field.description.trim().length) {
          entry.description = field.description;
        }

        if (field.enabled === false) {
          entry.disabled = true;
        }

        return entry;
      });

      return { type: 'multipart-form', data: multipartData };
    }

    case 'file': {
      const fileData: FileBodyVariant[] = (body.file || []).map((file): FileBodyVariant => ({
        filePath: file.filePath || '',
        contentType: file.contentType || '',
        selected: file.selected !== false
      }));

      return { type: 'file', data: fileData };
    }

    case 'graphql':
      return undefined;

    default:
      return undefined;
  }
};

export const toOpenCollectionGraphqlBody = (body: BrunoHttpRequestBody | null | undefined): GraphQLBody | undefined => {
  if (!body || body.mode !== 'graphql' || !body.graphql) {
    return undefined;
  }

  return {
    query: body.graphql.query || '',
    variables: body.graphql.variables || ''
  };
};
