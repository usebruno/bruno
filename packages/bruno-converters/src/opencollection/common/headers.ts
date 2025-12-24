import { uuid } from '../../common/index.js';
import type {
  HttpHeader,
  BrunoKeyValue
} from '../types';

export const fromOpenCollectionHeaders = (headers: HttpHeader[] | undefined): BrunoKeyValue[] => {
  if (!headers?.length) {
    return [];
  }

  return headers.map((header): BrunoKeyValue => ({
    uid: uuid(),
    name: header.name || '',
    value: header.value || '',
    description: typeof header.description === 'string' ? header.description : header.description?.content || null,
    enabled: header.disabled !== true
  }));
};

export const toOpenCollectionHeaders = (headers: BrunoKeyValue[] | null | undefined): HttpHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header): HttpHeader => {
    const httpHeader: HttpHeader = {
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
