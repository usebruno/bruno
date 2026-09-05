import { useState } from 'react';
import toast from 'react-hot-toast';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import importBrunoEnvironment from 'utils/importers/bruno-environment';
import { readMultipleFiles } from 'utils/importers/file-reader';
import { toastError } from 'utils/common/error';
import { generateCopyName, normalizeEnvName } from 'utils/environments';
import { detectEnvironmentFormat, RESOLUTION_TYPES } from '../../utils';
import { useEnvironmentTarget } from '../useEnvironmentTarget';

export const IMPORT_STEPS = { UPLOAD: 'UPLOAD', REVIEW: 'REVIEW' };
export const ENV_STATUS = { NEW: 'new', DUPLICATE: 'duplicate', INVALID: 'invalid' };

export const useEnvironmentImport = (type, collection, onClose, onEnvironmentCreated) => {
  const [step, setStep] = useState(IMPORT_STEPS.UPLOAD);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [resolutions, setResolutions] = useState(new Map());
  const [isImporting, setIsImporting] = useState(false);

  const { existingNames, getExistingEnv, saveEnv, createEnv } = useEnvironmentTarget(type, collection);

  const commitEnvironments = async (environmentsToImport, itemResolutions) => {
    let importedCount = 0;
    let failedCount = 0;
    const currentExistingNames = [...existingNames];

    const isNameDuplicate = (envName) => currentExistingNames.some((existingName) => normalizeEnvName(existingName) === normalizeEnvName(envName));
    const replacedNames = new Set();

    setIsImporting(true);
    for (const environment of environmentsToImport) {
      try {
        const isDuplicate = environment.status === ENV_STATUS.DUPLICATE;

        if (isDuplicate) {
          const resolution = itemResolutions.get(environment.id) || RESOLUTION_TYPES.COPY;
          const normalizedName = normalizeEnvName(environment.name);
          if (resolution === RESOLUTION_TYPES.REPLACE && !replacedNames.has(normalizedName)) {
            const existingEnv = getExistingEnv(environment.name);
            if (existingEnv) {
              await saveEnv(environment, existingEnv);
              replacedNames.add(normalizedName);
              importedCount++;
            } else {
              throw new Error(`Environment ${environment.name} not found for replacement`);
            }
          } else {
            // copy
            const copyName = generateCopyName(environment.name, currentExistingNames);
            currentExistingNames.push(copyName);
            await createEnv(copyName, environment);
            importedCount++;
          }
        } else {
          const name = isNameDuplicate(environment.name)
            ? generateCopyName(environment.name, currentExistingNames)
            : environment.name;
          currentExistingNames.push(name);
          await createEnv(name, environment);
          importedCount++;
        }
      } catch (error) {
        failedCount++;
      }
    }
    setIsImporting(false);

    if (failedCount > 0) {
      toastError(new Error(`${failedCount} environment(s) failed to import`), `${importedCount} environment(s) imported successfully, but ${failedCount} failed.`);
    } else if (importedCount > 0) {
      toast.success(`${importedCount > 1 ? `${importedCount} environments` : 'Environment'} imported successfully`);
    }

    onClose();
    if (onEnvironmentCreated) {
      onEnvironmentCreated();
    }
  };

  const handleImportEnvironment = async (files) => {
    if (isImporting) return;
    try {
      setIsImporting(true);
      const { parsedFiles, invalidFiles } = await readMultipleFiles(Array.from(files));

      const valid = [];
      const invalid = [];

      for (const file of parsedFiles) {
        try {
          const format = detectEnvironmentFormat(file.content);
          const result = format === 'postman'
            ? await importPostmanEnvironment([file])
            : await importBrunoEnvironment([file]);
          valid.push(...result.valid);
          invalid.push(...result.invalid);
        } catch (err) {
          invalid.push({ fileName: file.fileName || 'Unknown', error: 'Could not be read' });
        }
      }

      const validEnvironments = valid.filter((env) => env.name && env.name !== 'undefined');
      const missingNameEnvs = valid
        .filter((env) => !env.name || env.name === 'undefined')
        .map((env) => ({ fileName: env.fileName || 'Unknown', error: 'Environment has no name' }));

      const allInvalid = [...invalidFiles, ...invalid, ...missingNameEnvs];

      const existingNamesNormalized = new Set(existingNames.map(normalizeEnvName));

      let itemIndex = 0;
      const validItems = validEnvironments.map((env) => {
        const isDuplicate = existingNamesNormalized.has(normalizeEnvName(env.name));
        return { ...env, id: `env-${itemIndex++}`, status: isDuplicate ? ENV_STATUS.DUPLICATE : ENV_STATUS.NEW };
      });

      const invalidItems = allInvalid.map((env) => ({
        ...env, id: `env-${itemIndex++}`, status: ENV_STATUS.INVALID
      }));

      setItems([...validItems, ...invalidItems]);
      setSelected(new Set(validItems.map((item) => item.id)));

      const initialResolutions = new Map();
      validItems
        .filter((item) => item.status === ENV_STATUS.DUPLICATE)
        .forEach((item) => initialResolutions.set(item.id, RESOLUTION_TYPES.COPY));
      setResolutions(initialResolutions);

      setStep(IMPORT_STEPS.REVIEW);
    } catch (err) {
      toastError(err, 'Import environment failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (isImporting) return;
    const environmentsToImport = items.filter((env) => (env.status === ENV_STATUS.NEW || env.status === ENV_STATUS.DUPLICATE) && selected.has(env.id));

    if (environmentsToImport.length === 0) {
      toast.error('No environments selected to import');
      return;
    }

    await commitEnvironments(environmentsToImport, resolutions);
  };

  return {
    step,
    isImporting,
    items,
    selected,
    setSelected,
    resolutions,
    setResolutions,
    handleImportEnvironment,
    handleConfirmImport
  };
};
