import { each } from 'lodash';

const MAX_SKIPPED_FILES_LISTED = 5;

const hasValue = (value) => value !== undefined && value !== null && value !== '';

export const getEnvironmentVariablesKeyValuePairs = (envVariables) => {
  const variables = {};
  each(envVariables, (variable) => {
    if (variable.name && variable.enabled && hasValue(variable.value)) {
      variables[variable.name] = variable.value;
    }
  });
  return variables;
};

export const buildSpecVariables = ({ collectionVariables, envVariables, environment, processEnvVariables }) => ({
  ...(collectionVariables || {}),
  ...(environment ? getEnvironmentVariablesKeyValuePairs(envVariables?.[environment] || {}) : {}),
  process: { env: { ...(processEnvVariables || {}) } }
});

export const buildSkippedFilesMessage = (skipped) => {
  const listed = skipped.slice(0, MAX_SKIPPED_FILES_LISTED);
  const remaining = skipped.length - listed.length;
  const names = listed.join(', ');
  const summary = remaining > 0 ? `${names} and ${remaining} more` : names;
  const subject = skipped.length === 1 ? 'it was' : 'they were';
  return `Could not parse ${summary}; ${subject} skipped`;
};

export const buildExportWarningsMessage = (warnings) => {
  const label = warnings.length === 1 ? 'warning' : 'warnings';
  return `Created with ${warnings.length} ${label}; some request bodies could not be fully parsed`;
};
