import { getAllVariables } from 'utils/collections';

// Resolves the variables available to an app. For request level apps, pass
// the parent request as `item`, otherwise the app is treated as
// collection level. Excludes non-variable and OAuth2 credential secret
// entries returned by `getAllVariables()`.
export const buildVariables = (collection, item) => {
  const { pathParams, maskedEnvVariables, process, ...variables } = getAllVariables(collection, item) || {};
  return Object.fromEntries(Object.entries(variables).filter(([key]) => !key.startsWith('$oauth2.')));
};
