import type { HttpRequestBody as BrunoHttpRequestBody } from '@usebruno/schema-types/requests/http';
import type {
  HttpRequestBody,
  RawBody,
  FormUrlEncodedBody,
  FormUrlEncodedEntry,
  MultipartFormBody,
  MultipartFormEntry,
  FileBody,
  FileBodyEntry
} from '@opencollection/types/requests/http';
import type { KeyValue as BrunoKeyValue } from '@usebruno/schema-types/common/key-value';
import { uuid, ensureString } from '../../../utils';

export const toOpenCollectionBody = (body: BrunoHttpRequestBody | null | undefined): HttpRequestBody | undefined => {
  if (!body) {
    return undefined;
  }

  switch (body.mode) {
    case 'none':
      return undefined;

    case 'json':
      const rawBody: RawBody = {
        type: 'json',
        data: body.json || ''
      };
      return rawBody;

    case 'text':
      const textBody: RawBody = {
        type: 'text',
        data: body.text || ''
      };
      return textBody;

    case 'xml':
      const xmlBody: RawBody = {
        type: 'xml',
        data: body.xml || ''
      };
      return xmlBody;

    case 'sparql':
      const sparqlBody: RawBody = {
        type: 'sparql',
        data: body.sparql || ''
      };
      return sparqlBody;

    case 'formUrlEncoded':
      const formEntries: FormUrlEncodedEntry[] = body.formUrlEncoded?.map((entry: BrunoKeyValue): FormUrlEncodedEntry => {
        const formEntry: FormUrlEncodedEntry = {
          name: entry.name || '',
          value: entry.value || ''
        };

        if (entry?.description?.trim().length) {
          formEntry.description = entry.description;
        }

        if (entry.enabled === false) {
          formEntry.disabled = true;
        }

        return formEntry;
      }) || [];

      const formBody: FormUrlEncodedBody = {
        type: 'form-urlencoded',
        ...(formEntries.length > 0 && { data: formEntries })
      } as FormUrlEncodedBody;
      return formBody;

    case 'multipartForm':
      const multipartEntries: MultipartFormEntry[] = body.multipartForm?.map((entry): MultipartFormEntry => {
        const multipartEntry: MultipartFormEntry = {
          name: entry.name || '',
          type: entry.type,
          value: entry.value || (entry.type === 'file' ? [] : '')
        };

        if (entry?.contentType?.trim().length) {
          multipartEntry.contentType = entry.contentType;
        }

        if (entry?.description?.trim().length) {
          multipartEntry.description = entry.description;
        }

        if (entry.enabled === false) {
          multipartEntry.disabled = true;
        }

        return multipartEntry;
      }) || [];

      const multipartBody: MultipartFormBody = {
        type: 'multipart-form',
        ...(multipartEntries.length > 0 && { data: multipartEntries })
      } as MultipartFormBody;
      return multipartBody;

    case 'file':
      const fileEntries: FileBodyEntry[] = body.file?.map((file): FileBodyEntry => {
        return {
          filePath: file.filePath || '',
          contentType: file.contentType || '',
          selected: file.selected ?? false
        };
      }) || [];

      const fileBody: FileBody = {
        type: 'file',
        ...(fileEntries.length > 0 && { data: fileEntries })
      } as FileBody;
      return fileBody;

    case 'graphql':
      // GraphQL body is handled separately in GraphQL request stringify
      return undefined;

    default:
      return undefined;
  }
};

export const toBrunoBody = (body: HttpRequestBody | null | undefined): BrunoHttpRequestBody | undefined => {
  if (!body) {
    return {
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
  }

  const brunoBody: BrunoHttpRequestBody = {
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

  switch (body.type) {
    case 'json':
      brunoBody.mode = 'json';
      brunoBody.json = body.data || '';
      break;

    case 'text':
      brunoBody.mode = 'text';
      brunoBody.text = body.data || '';
      break;

    case 'xml':
      brunoBody.mode = 'xml';
      brunoBody.xml = body.data || '';
      break;

    case 'sparql':
      brunoBody.mode = 'sparql';
      brunoBody.sparql = body.data || '';
      break;

    case 'form-urlencoded':
      brunoBody.mode = 'formUrlEncoded';
      brunoBody.formUrlEncoded = body.data?.map((entry): BrunoKeyValue => {
        const formEntry: BrunoKeyValue = {
          uid: uuid(),
          name: ensureString(entry.name),
          value: ensureString(entry.value),
          enabled: entry.disabled !== true
        };

        if (entry.description) {
          if (typeof entry.description === 'string' && entry.description.trim().length) {
            formEntry.description = entry.description;
          } else if (typeof entry.description === 'object' && entry.description.content?.trim().length) {
            formEntry.description = entry.description.content;
          }
        }

        return formEntry;
      }) || [];
      break;

    case 'multipart-form':
      brunoBody.mode = 'multipartForm';
      brunoBody.multipartForm = body.data?.map((entry): any => {
        const multipartEntry: any = {
          uid: uuid(),
          type: entry.type,
          name: ensureString(entry.name),
          value: entry.type === 'file' ? (entry.value || []) : ensureString(entry.value),
          contentType: entry.contentType || null,
          enabled: entry.disabled !== true
        };

        if (entry.description) {
          if (typeof entry.description === 'string' && entry.description.trim().length) {
            multipartEntry.description = entry.description;
          } else if (typeof entry.description === 'object' && entry.description.content?.trim().length) {
            multipartEntry.description = entry.description.content;
          }
        }

        return multipartEntry;
      }) || [];
      break;

    case 'file':
      brunoBody.mode = 'file';
      brunoBody.file = body.data?.map((file): any => ({
        uid: uuid(),
        filePath: file.filePath || '',
        contentType: file.contentType || '',
        selected: file.selected ?? false
      })) || [];
      break;

    default:
      break;
  }

  return brunoBody;
};
