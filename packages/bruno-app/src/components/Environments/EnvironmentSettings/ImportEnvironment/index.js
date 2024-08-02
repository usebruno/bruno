import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import { importEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { toastError } from 'utils/common/error';
import { IconDatabaseImport } from '@tabler/icons';

const ImportEnvironment = ({ collection }) => {
  const dispatch = useDispatch();

  const handleImportPostmanEnvironment = () => {
    importPostmanEnvironment()
      .then((environments) => {
        environments
          .filter((env) =>
            env.name && env.name !== 'undefined'
              ? true
              : () => {
                  toast.error('Failed to import environment: env has no name');
                  return false;
                }
          )
          .map((environment) => {
            dispatch(importEnvironment(environment.name, environment.variables, collection.uid))
              .then(() => {
                toast.success('Environment imported successfully');
              })
              .catch(() => toast.error('An error occurred while importing the environment'));
          });
      })
      .catch((err) => toastError(err, 'Postman Import environment failed'));
  };

  return (
    <button
      type="button"
      onClick={handleImportPostmanEnvironment}
      className="flex justify-center flex-col items-center w-full dark:bg-zinc-700 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-400 p-12 text-center hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
    >
      <IconDatabaseImport size={64} />
      <span className="mt-2 block text-sm font-semibold">Import your Postman environments</span>
    </button>
  );
};

export default ImportEnvironment;
