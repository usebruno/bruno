import { RequestContext } from '../types';

function applyCollectionHeader(context: RequestContext) {
  const mergedHeaders = [...(context.collection.root.request?.headers ?? []), ...context.requestItem.request.headers];

  context.debug.log('Collection header applied', {
    collectionHeaders: context.collection.root.request?.headers ?? [],
    requestHeaders: context.requestItem.request.headers,
    mergedHeaders
  });

  context.requestItem.request.headers = mergedHeaders;
}

function applyCollectionAuth(context: RequestContext) {
  if (context.requestItem.request.auth.mode !== 'inherit') {
    context.debug.log('Collection auth skipped', {
      requestMode: context.requestItem.request.auth.mode,
      collectionMode: context.collection.root.request?.auth.mode,
      finalAuth: context.requestItem.request.auth
    });
    return;
  }

  context.requestItem.request.auth = context.collection.root.request?.auth || { mode: 'none' };

  context.debug.log('Collection auth applied', {
    requestMode: 'inherit', // Its always inherit at this point
    collectionMode: context.requestItem.request.auth.mode,
    finalAuth: context.requestItem.request.auth
  });
}

export function applyCollectionSettings(context: RequestContext) {
  applyCollectionHeader(context);
  applyCollectionAuth(context);
}
