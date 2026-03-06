import type { HttpRequestParam as BrunoHttpRequestParam, Decorator } from '@usebruno/schema-types/requests/http';
import type { HttpRequestParam } from '@opencollection/types/requests/http';
import { uuid, ensureString } from '../../../utils';

// Extended type to include decorators (not in @opencollection/types yet)
interface HttpRequestParamWithDecorators extends HttpRequestParam {
  decorators?: Decorator[];
}

export const toOpenCollectionParams = (params: BrunoHttpRequestParam[] | null | undefined): HttpRequestParamWithDecorators[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const ocParams = params.map((param: BrunoHttpRequestParam): HttpRequestParamWithDecorators => {
    const ocParam: HttpRequestParamWithDecorators = {
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

    // Include decorators if present
    if (param.decorators?.length) {
      ocParam.decorators = param.decorators;
    }

    return ocParam;
  });

  return ocParams.length ? ocParams : undefined;
};

export const toBrunoParams = (params: HttpRequestParamWithDecorators[] | null | undefined): BrunoHttpRequestParam[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const brunoParams = params.map((param: HttpRequestParamWithDecorators): BrunoHttpRequestParam => {
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

    // Include decorators if present
    if (param.decorators?.length) {
      brunoParam.decorators = param.decorators;
    }

    return brunoParam;
  });

  return brunoParams.length ? brunoParams : undefined;
};
