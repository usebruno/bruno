import { normalizeEnvName } from 'utils/environments';

export const IMPORT_STEPS = { UPLOAD: 'UPLOAD', REVIEW: 'REVIEW' };
export const ENV_STATUS = { NEW: 'new', DUPLICATE: 'duplicate', INVALID: 'invalid' };

export const detectEnvironmentFormat = (data) => {
  if (data.info && data.info.type === 'bruno-environment') {
    return 'bruno';
  } else if (Array.isArray(data)) {
    return data.some((env) => env.info && env.info.type === 'bruno-environment') ? 'bruno' : 'postman';
  } else if (data.id && data.values) {
    return 'postman';
  }
  return 'bruno';
};

export const RESOLUTION_TYPES = {
  CREATE_NEW: 'create_new',
  REPLACE: 'replace'
};

export const RESOLUTION_OPTIONS = [
  { value: RESOLUTION_TYPES.CREATE_NEW, label: 'New', title: 'Import as a new environment', testId: 'env-import-create-new-btn' },
  { value: RESOLUTION_TYPES.REPLACE, label: 'Replace', title: 'Replace existing', testId: 'env-import-replace-btn' }
];

const failedRow = (source, error) => ({
  fileName: source?.fileName || 'Unknown',
  error,
  status: ENV_STATUS.INVALID
});

export const buildReviewItems = ({ valid = [], invalid = [], existingNames = [] }) => {
  const takenNames = new Set(existingNames.map(normalizeEnvName));
  const importable = [];
  const failures = invalid.map((failure) => failedRow(failure, failure?.error));

  for (const env of valid) {
    try {
      const status = takenNames.has(normalizeEnvName(env.name)) ? ENV_STATUS.DUPLICATE : ENV_STATUS.NEW;
      importable.push({ ...env, status });
    } catch (err) {
      failures.push(failedRow(env, 'Could not be read'));
    }
  }

  return [...importable, ...failures].map((item, index) => ({ ...item, id: `env-${index}` }));
};

/** Everything the user can actually import starts out ticked. */
export const initialSelection = (items) =>
  new Set(items.filter((item) => item.status !== ENV_STATUS.INVALID).map((item) => item.id));

/** A conflict defaults to landing as a new environment rather than overwriting one. */
export const initialResolutions = (items) =>
  new Map(
    items
      .filter((item) => item.status === ENV_STATUS.DUPLICATE)
      .map((item) => [item.id, RESOLUTION_TYPES.CREATE_NEW])
  );
