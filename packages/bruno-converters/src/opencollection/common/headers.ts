import { uuid } from '../../common/index.js';
import type {
  HttpRequestHeader,
  BrunoKeyValue
} from '../types';

export const fromOpenCollectionHeaders = (headers: HttpRequestHeader[] | undefined): BrunoKeyValue[] => {
  if (!headers?.length) {
    return [];
  }

  return headers.map((header): BrunoKeyValue => {
    const entry: BrunoKeyValue = {
      uid: uuid(),
      name: header.name || '',
      value: header.value || '',
      enabled: header.disabled !== true
    };
    const desc = typeof header.description === 'string' ? header.description : header.description?.content;
    if (desc && desc.trim().length) entry.description = desc;
    return entry;
  });
};

export const toOpenCollectionHeaders = (headers: BrunoKeyValue[] | null | undefined): HttpRequestHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header): HttpRequestHeader => {
    const httpHeader: HttpRequestHeader = {
      name: header.name || '',
      value: header.value || ''
    };

    if (header.description && typeof header.description === 'string' && header.description.trim().length) {
      httpHeader.description = header.description;
    }

    if (header.enabled === false) {
      httpHeader.disabled = true;
    }

    return httpHeader;
  });

  return ocHeaders.length ? ocHeaders : undefined;
};
