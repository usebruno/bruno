import { useState } from 'react';
import toast from 'react-hot-toast';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import importBrunoEnvironment from 'utils/importers/bruno-environment';
import { readMultipleFiles } from 'utils/importers/file-reader';
import { toastError } from 'utils/common/error';
import { generateCopyName } from 'utils/environments';
import { detectEnvironmentFormat, normalizeEnvName } from '../../utils';
import { useEnvironmentTarget } from '../useEnvironmentTarget';

export const useEnvironmentImport = (type, collection, onClose, onEnvironmentCreated) => {
  const [step, setStep] = useState('UPLOAD'); // 'UPLOAD' | 'REVIEW'
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [resolutions, setResolutions] = useState(new Map());

  const { existingNames, getExistingEnv, saveEnv, createEnv } = useEnvironmentTarget(type, collection);

  const commitEnvironments = async (environmentsToImport, itemResolutions) => {
    try {
      let importedCount = 0;
      const currentExistingNames = [...existingNames];

      for (const environment of environmentsToImport) {
        const isDuplicate = environment.status === 'duplicate';

        if (isDuplicate) {
          const resolution = itemResolutions.get(environment.id) || 'copy';
          if (resolution === 'replace') {
            const existingEnv = getExistingEnv(environment.name);
            if (existingEnv) {
              await saveEnv(environment, existingEnv);
              importedCount++;
            }
          } else {
            // copy
            const copyName = generateCopyName(environment.name, currentExistingNames);
            currentExistingNames.push(copyName);
            await createEnv(copyName, environment);
            importedCount++;
          }
        } else {
          const name = currentExistingNames.some((existingName) => normalizeEnvName(existingName) === normalizeEnvName(environment.name))
            ? generateCopyName(environment.name, currentExistingNames)
            : environment.name;
          currentExistingNames.push(name);
          await createEnv(name, environment);
          importedCount++;
        }
      }

      toast.success(`${importedCount > 1 ? `${importedCount} environments` : 'Environment'} imported successfully`);
      onClose();
      if (onEnvironmentCreated) {
        onEnvironmentCreated();
      }
    } catch (error) {
      toastError(error, 'An error occurred while importing the environment(s)');
    }
  };

  const handleImportEnvironment = async (files) => {
    try {
      const { parsedFiles, invalidFiles } = await readMultipleFiles(Array.from(files));

      const filesByFormat = parsedFiles.reduce((acc, file) => {
        const format = detectEnvironmentFormat(file.content);
        (acc[format] = acc[format] || []).push(file);
        return acc;
      }, {});

      const results = await Promise.all(
        Object.entries(filesByFormat).map(([format, filesForFormat]) =>
          format === 'postman' ? importPostmanEnvironment(filesForFormat) : importBrunoEnvironment(filesForFormat)
        )
      );

      const result = {
        valid: results.flatMap((r) => r.valid),
        invalid: results.flatMap((r) => r.invalid)
      };

      const validEnvironments = result.valid.filter((env) => env.name && env.name !== 'undefined');
      const missingNameEnvs = result.valid
        .filter((env) => !env.name || env.name === 'undefined')
        .map((env) => ({ fileName: env.fileName || 'Unknown', error: 'Environment has no name' }));

      const allInvalid = [...invalidFiles, ...result.invalid, ...missingNameEnvs];

      const existingNamesNormalized = existingNames.map(normalizeEnvName);

      let itemIndex = 0;
      const validItems = validEnvironments.map((env) => {
        const isDuplicate = existingNamesNormalized.includes(normalizeEnvName(env.name));
        return { ...env, id: `env-${itemIndex++}`, status: isDuplicate ? 'duplicate' : 'new' };
      });

      const invalidItems = allInvalid.map((env) => ({
        ...env, id: `env-${itemIndex++}`, status: 'invalid'
      }));

      const newItems = [...validItems, ...invalidItems];
      const duplicates = validItems.filter((e) => e.status === 'duplicate');

      if (duplicates.length === 0 && allInvalid.length === 0) {
        await commitEnvironments(validItems, new Map());
        return;
      }

      setItems(newItems);

      const initialSelected = new Set(validItems.map((i) => i.id));
      setSelected(initialSelected);

      const initialResolutions = new Map();
      duplicates.forEach((e) => {
        initialResolutions.set(e.id, 'copy');
      });
      setResolutions(initialResolutions);

      setStep('REVIEW');
    } catch (err) {
      toastError(err, 'Import environment failed');
    }
  };

  const handleConfirmImport = async () => {
    const environmentsToImport = items.filter((env) => (env.status === 'new' || env.status === 'duplicate') && selected.has(env.id));

    if (environmentsToImport.length === 0) {
      toast.error('No environments selected to import');
      return;
    }

    await commitEnvironments(environmentsToImport, resolutions);
  };

  return {
    step,
    items,
    selected,
    setSelected,
    resolutions,
    setResolutions,
    handleImportEnvironment,
    handleConfirmImport
  };
};
