import { uuid } from 'utils/common';
import { addGlobalEnvironment, saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';

export const NEW_ENVIRONMENT = '__new__';

export const defaultVaultConfig = {
  enabled: true,
  target: 'global',
  environmentUid: NEW_ENVIRONMENT,
  environmentName: 'Postman Vault',
  values: {}
};

const buildSecretVariable = (name, value) => ({
  uid: uuid(),
  name,
  value,
  type: 'text',
  enabled: true,
  secret: true
});

export const vaultSkipIssues = (vaultKeys) =>
  vaultKeys.map(({ key, name }) => ({
    path: 'Vault Secrets',
    severity: 'warning',
    message: `Vault secret "${key}" was imported as {{${name}}} and has no value yet.`
  }));

/**
 * Creates the secret variables for the vault keys found during import, in whichever environment
 * the user picked. Returns the issues to report for keys left without a value.
 *
 * The collection branch mutates each collection's `environments` so the environment is written as
 * part of the import itself; values are not carried there because the collection import path
 * writes environments by stringifying them, and both formats serialize secret names without
 * values. The global branch writes once, whatever the number of collections.
 */
export const applyVaultSecrets = async ({ vaultKeys, config, collections, globalEnvironments, dispatch }) => {
  if (!vaultKeys.length) {
    return [];
  }

  if (!config.enabled) {
    return vaultSkipIssues(vaultKeys);
  }

  if (config.target === 'collection') {
    collections.forEach((collection) => {
      collection.environments = [
        ...(collection.environments || []),
        {
          uid: uuid(),
          name: config.environmentName,
          variables: vaultKeys.map(({ name }) => buildSecretVariable(name, ''))
        }
      ];
    });

    return vaultSkipIssues(vaultKeys);
  }

  const existingEnvironment
    = config.environmentUid !== NEW_ENVIRONMENT
      ? globalEnvironments.find((environment) => environment.uid === config.environmentUid)
      : null;

  if (existingEnvironment) {
    const existingNames = new Set((existingEnvironment.variables || []).map((variable) => variable.name));
    const missingKeys = vaultKeys.filter(({ name }) => !existingNames.has(name));

    if (missingKeys.length) {
      await dispatch(
        saveGlobalEnvironment({
          environmentUid: existingEnvironment.uid,
          variables: [
            ...existingEnvironment.variables,
            ...missingKeys.map(({ name }) => buildSecretVariable(name, config.values[name] || ''))
          ]
        })
      );
    }

    return vaultSkipIssues(missingKeys.filter(({ name }) => !config.values[name]));
  }

  await dispatch(
    addGlobalEnvironment({
      name: config.environmentName,
      variables: vaultKeys.map(({ name }) => buildSecretVariable(name, config.values[name] || ''))
    })
  );

  return vaultSkipIssues(vaultKeys.filter(({ name }) => !config.values[name]));
};
