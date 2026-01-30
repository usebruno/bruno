import type { HttpRequestParam as BrunoHttpRequestParam } from '@usebruno/schema-types/requests/http';
import type { HttpRequestParam } from '@opencollection/types/requests/http';
import { uuid, ensureString } from '../../../utils';

export const toOpenCollectionParams = (params: BrunoHttpRequestParam[] | null | undefined): HttpRequestParam[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const ocParams = params.map((param: BrunoHttpRequestParam): HttpRequestParam => {
    const ocParam: HttpRequestParam = {
      name: param.name || '',
      value: param.value || '',
      type: param.type
    };

    if (param?.description?.trim().length) {
      ocParam.description = param.description;
    }

    if (param.enabled === false) {
      ocParam.disabled = true;
    }

    return ocParam;
  });

  return ocParams.length ? ocParams : undefined;
};

export const toBrunoParams = (params: HttpRequestParam[] | null | undefined): BrunoHttpRequestParam[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const brunoParams = params.map((param: HttpRequestParam): BrunoHttpRequestParam => {
    const brunoParam: BrunoHttpRequestParam = {
      uid: uuid(),
      name: ensureString(param.name),
      value: ensureString(param.value),
      type: param.type,
      enabled: param.disabled !== true
    };

    if (param.description) {
      if (typeof param.description === 'string' && param.description.trim().length) {
        brunoParam.description = param.description;
      } else if (typeof param.description === 'object' && param.description.content?.trim().length) {
        brunoParam.description = param.description.content;
      }
    }

    return brunoParam;
  });

  return brunoParams.length ? brunoParams : undefined;
};
