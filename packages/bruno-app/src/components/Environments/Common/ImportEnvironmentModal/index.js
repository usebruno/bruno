import React, { useState } from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import importBrunoEnvironment from 'utils/importers/bruno-environment';
import { readMultipleFiles } from 'utils/importers/file-reader';
import { importEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { sanitizeName } from 'utils/common/regex';
import { IconFileImport } from '@tabler/icons';

const ImportEnvironmentModal = ({ type = 'collection', collection, onClose, onEnvironmentCreated }) => {
  const dispatch = useDispatch();
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments) || [];
  const [isDragOver, setIsDragOver] = useState(false);

  const isGlobal = type === 'global';

  // Validate required props
  if (!isGlobal && !collection) {
    console.error('ImportEnvironmentModal: collection prop is required when type is "collection"');
    return null;
  }
  const modalTitle = isGlobal ? 'Import Global Environment' : 'Import Environment';
  const modalTestId = isGlobal ? 'import-global-environment-modal' : 'import-environment-modal';
  const importTestId = isGlobal ? 'import-global-environment' : 'import-environment';

  const processEnvironments = async (environments, parseFailures = []) => {
    const failures = [...parseFailures];

    const named = [];
    let unnamed = 0;
    for (const env of environments) {
      if (env.name && env.name !== 'undefined') named.push(env);
      else unnamed++;
    }

    const existing = isGlobal ? globalEnvironments : collection?.environments || [];
    const seen = new Set(existing.map((e) => sanitizeName(e.name || '')));

    const toImport = [];
    let skipped = 0;
    for (const env of named) {
      const name = sanitizeName(env.name);
      if (seen.has(name)) {
        skipped++;
        continue;
      }
      seen.add(name);
      toImport.push({ ...env, name });
    }

    let imported = 0;
    for (const environment of toImport) {
      try {
        const action = isGlobal
          ? addGlobalEnvironment({ name: environment.name, variables: environment.variables, color: environment.color })
          : importEnvironment({ name: environment.name, variables: environment.variables, color: environment.color, collectionUid: collection?.uid });

        await dispatch(action);
        imported++;
      } catch (error) {
        console.error(`Failed to import environment "${environment.name}":`, error);
        failures.push({ name: environment.name, message: error?.message || String(error) });
      }
    }

    if (imported > 0) {
      toast.success(`Imported ${imported} environment${imported > 1 ? 's' : ''}.`);
    }

    const notes = [];
    if (skipped > 0) notes.push(`${skipped} already existed and ${skipped > 1 ? 'were' : 'was'} skipped`);
    if (unnamed > 0) notes.push(`${unnamed} had no name`);
    if (failures.length > 0) {
      const names = failures.map((f) => f.name).slice(0, 3).join(', ');
      const more = failures.length > 3 ? ` and ${failures.length - 3} more` : '';
      notes.push(`${failures.length} failed (${names}${more})`);
    }

    if (notes.length > 0) {
      const message = notes.join('; ') + '.';
      if (failures.length > 0) toast.error(message);
      else toast(message);
    } else if (imported === 0) {
      toast.error('No valid environments found to import.');
    }

    return { imported, skipped, unnamed, failures };
  };

  const detectEnvironmentFormat = (data) => {
    // bruno environment `single-object` export type
    if (data.info && data.info.type === 'bruno-environment') {
      return 'bruno';
    } else if (Array.isArray(data)) {
      // bruno environment`single-file` export type
      return data.some((env) => env.info && env.info.type === 'bruno-environment') ? 'bruno' : 'postman';
    } else if (data.id && data.values) {
      // postman environment
      return 'postman';
    }
    return 'bruno';
  };

  const handleImportEnvironment = async (files) => {
    const environments = [];
    const parseFailures = [];
    for (const file of Array.from(files)) {
      let parsedFile;
      try {
        [parsedFile] = await readMultipleFiles([file]);
      } catch (err) {
        console.error(`Failed to read ${file.name}:`, err);
        parseFailures.push({ name: file.name, message: err?.message || String(err) });
        continue;
      }

      try {
        const format = detectEnvironmentFormat(parsedFile.content);
        const result
          = format === 'postman'
            ? await importPostmanEnvironment([parsedFile])
            : await importBrunoEnvironment([parsedFile]);
        environments.push(...result);
      } catch (err) {
        console.error(`Failed to parse ${parsedFile.fileName}:`, err);
        parseFailures.push({ name: parsedFile.fileName, message: err?.message || String(err) });
      }
    }

    const summary = await processEnvironments(environments, parseFailures);

    if (summary.imported === 0 && summary.skipped === 0) {
      return;
    }

    onClose();
    if (summary.imported > 0 && onEnvironmentCreated) {
      onEnvironmentCreated();
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.json';
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImportEnvironment(e.target.files);
      }
    };
    input.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImportEnvironment(files);
    }
  };

  return (
    <Portal>
      <Modal size="md" title={modalTitle} hideFooter={true} handleConfirm={onClose} handleCancel={onClose} dataTestId={modalTestId}>
        <div className="py-2">
          <div
            className={`flex justify-center flex-col items-center w-full dark:bg-zinc-700 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              isDragOver
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                : 'border-zinc-300 dark:border-zinc-400 hover:border-zinc-400'
            }`}
            onClick={handleFileSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid={importTestId}
          >
            <IconFileImport size={64} />
            <span className="mt-2 block font-medium">
              {isDragOver ? 'Drop your environment files here' : 'Import your environments'}
            </span>
            <span className="mt-1 block text-xs text-muted">
              Drag & drop JSON files/folders or click to browse. Supports both Bruno and Postman formats.
            </span>
          </div>
        </div>
      </Modal>
    </Portal>
  );
};

export default ImportEnvironmentModal;
