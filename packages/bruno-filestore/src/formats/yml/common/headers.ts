import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { KeyValue as BrunoKeyValue } from '@usebruno/schema-types/common/key-value';
import type { HttpRequestHeader, HttpResponseHeader } from '@opencollection/types/requests/http';
import { uuid, ensureString } from '../../../utils';

export const toOpenCollectionHttpHeaders = (headers: BrunoFolderRequest['headers']): HttpRequestHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header: BrunoKeyValue): HttpRequestHeader => {
    const httpHeader: HttpRequestHeader = {
      name: header.name || '',
      value: header.value || ''
    };
    if (header?.description?.trim().length) {
      httpHeader.description = header.description;
    }
    if (header.enabled === false) {
      httpHeader.disabled = true;
    }
    return httpHeader;
  });

  return ocHeaders.length ? ocHeaders : undefined;
};

export const toOpenCollectionResponseHeaders = (headers: BrunoFolderRequest['headers']): HttpResponseHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header: BrunoKeyValue): HttpResponseHeader => ({
    name: header.name || '',
    value: header.value || ''
  }));

  return ocHeaders.length ? ocHeaders : undefined;
};

export const toBrunoHttpHeaders = (headers: HttpRequestHeader[] | HttpResponseHeader[] | null | undefined): BrunoKeyValue[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const brunoHeaders = headers.map((header): BrunoKeyValue => {
    const brunoHeader: BrunoKeyValue = {
      uid: uuid(),
      name: ensureString(header.name),
      value: ensureString(header.value),
      enabled: ('disabled' in header) ? header.disabled !== true : true
    };

    return brunoHeader;
  });

  return brunoHeaders.length ? brunoHeaders : undefined;
};
