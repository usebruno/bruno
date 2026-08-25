import { useState } from 'react';
import toast from 'react-hot-toast';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import importBrunoEnvironment from 'utils/importers/bruno-environment';
import { readMultipleFiles } from 'utils/importers/file-reader';
import { toastError } from 'utils/common/error';
import { generateCopyName } from 'utils/environments';
import { detectEnvironmentFormat, normalizeEnvName } from '../utils';
import { useEnvironmentTarget } from './useEnvironmentTarget';

export const useEnvironmentImport = (type, collection, onClose, onEnvironmentCreated) => {
  const [step, setStep] = useState('UPLOAD'); // 'UPLOAD' | 'REVIEW'
  const [parsedData, setParsedData] = useState({ new: [], duplicates: [], invalid: [] });
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [resolutions, setResolutions] = useState(new Map());

  const { existingNames, getExistingEnv, saveEnv, createEnv } = useEnvironmentTarget(type, collection);

  const commitEnvironments = async (environmentsToImport, duplicates, itemResolutions) => {
    try {
      let importedCount = 0;
      const currentExistingNames = [...existingNames];

      for (const environment of environmentsToImport) {
        const isDuplicate = duplicates.includes(environment);

        if (isDuplicate) {
          const resolution = itemResolutions.get(environment) || 'copy';
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
      const parsedFiles = await readMultipleFiles(Array.from(files));
      const format = detectEnvironmentFormat(parsedFiles[0].content);
      let result;

      if (format === 'postman') {
        result = await importPostmanEnvironment(parsedFiles);
      } else {
        result = await importBrunoEnvironment(parsedFiles);
      }

      const validEnvironments = result.valid.filter((env) => env.name && env.name !== 'undefined');
      const missingNameEnvs = result.valid.filter((env) => !env.name || env.name === 'undefined').map((env) => ({ fileName: env.fileName || 'Unknown', error: 'Environment has no name' }));

      const allInvalid = [...result.invalid, ...missingNameEnvs];

      if (allInvalid.length > 0) {
        toast.error('One or more environment files have an invalid or unsupported format');
        return;
      }

      const existingNamesNormalized = existingNames.map(normalizeEnvName);
      const duplicates = validEnvironments.filter((e) => existingNamesNormalized.includes(normalizeEnvName(e.name)));
      const newEnvs = validEnvironments.filter((e) => !existingNamesNormalized.includes(normalizeEnvName(e.name)));

      if (duplicates.length === 0) {
        await commitEnvironments(newEnvs, [], new Map());
        return;
      }

      setParsedData({ new: newEnvs, duplicates, invalid: allInvalid });

      const initialSelected = new Set();
      validEnvironments.forEach((_, idx) => initialSelected.add(idx));
      setSelectedIndices(initialSelected);

      const initialResolutions = new Map();
      duplicates.forEach((e) => {
        initialResolutions.set(e, 'copy');
      });
      setResolutions(initialResolutions);

      setStep('REVIEW');
    } catch (err) {
      toastError(err, 'Import environment failed');
    }
  };

  const handleConfirmImport = async () => {
    const validEnvironments = [...parsedData.new, ...parsedData.duplicates];
    const environmentsToImport = validEnvironments.filter((_, idx) => selectedIndices.has(idx));

    if (environmentsToImport.length === 0) {
      toast.error('No environments selected to import');
      return;
    }

    await commitEnvironments(environmentsToImport, parsedData.duplicates, resolutions);
  };

  return {
    step,
    parsedData,
    selectedIndices,
    setSelectedIndices,
    resolutions,
    setResolutions,
    handleImportEnvironment,
    handleConfirmImport
  };
};
