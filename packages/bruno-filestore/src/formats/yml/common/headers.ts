import type { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import type { KeyValue as BrunoKeyValue } from '@usebruno/schema-types/common/key-value';
import type { HttpHeader } from '@opencollection/types/requests/http';
import { uuid } from '../../../utils';

export const toOpenCollectionHttpHeaders = (headers: BrunoFolderRequest['headers']): HttpHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header: BrunoKeyValue): HttpHeader => {
    const httpHeader: HttpHeader = {
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

export const toBrunoHttpHeaders = (headers: HttpHeader[] | null | undefined): BrunoKeyValue[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const brunoHeaders = headers.map((header: HttpHeader): BrunoKeyValue => {
    const brunoHeader: BrunoKeyValue = {
      uid: uuid(),
      name: header.name || '',
      value: header.value || '',
      enabled: header.disabled !== true
    };

    return brunoHeader;
  });

  return brunoHeaders.length ? brunoHeaders : undefined;
};
