import { resolveInheritedAuth } from 'utils/auth';

const resolveItemAuthForDocumentation = (item, collection) => {
  if (item?.type === 'http-request' && item?.request?.auth?.mode === 'inherit') {
    item.request.auth = resolveInheritedAuth(item, collection).auth;
  }

  if (Array.isArray(item?.items)) {
    item.items.forEach((child) => resolveItemAuthForDocumentation(child, collection));
  }
};

export const resolveInheritedAuthForDocumentation = (collection) => {
  if (!collection?.items?.length) {
    return collection;
  }

  collection.items.forEach((item) => resolveItemAuthForDocumentation(item, collection));
  return collection;
};
