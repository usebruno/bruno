import React from 'react';
import { IconFolder, IconSettings, IconAlertCircle, IconFileImport } from '@tabler/icons';

const ImportPathsTab = ({
  collectionImportPaths,
  collectionImportPathsExistence,
  invalidImportPaths,
  onOpenCollectionGrpc,
  onBrowseImportPath,
  onToggleImportPath
}) => {
  return (
    <>
      {collectionImportPaths && collectionImportPaths.length > 0 && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-neutral-500">From Collection Settings</div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenCollectionGrpc();
              }}
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              <IconSettings size={16} strokeWidth={1.5} />
            </button>
          </div>

          {invalidImportPaths.length > 0 && (
            <div className="mb-2 p-2 bg-transparent rounded text-xs text-red-600 dark:text-red-400">
              <p className="flex items-center">
                <IconAlertCircle size={16} strokeWidth={1.5} className="mr-1" />
                Some import paths could not be found. <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCollectionGrpc();
                  }}
                  className="text-red-600 dark:text-red-400 underline hover:text-red-700 dark:hover:text-red-300 ml-1"
                >
                  Manage import paths
                </button>
              </p>
            </div>
          )}

          <div className="space-y-1 max-h-60 overflow-auto max-w-[30rem]">
            {collectionImportPathsExistence.map((importPath, index) => {
              const isInvalid = !importPath.exists;

              return (
                <div
                  key={`collection-import-${index}`}
                  className={`py-2 px-3 ${isInvalid ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center mr-3">
                        <input
                          type="checkbox"
                          checked={importPath.enabled}
                          disabled={isInvalid}
                          onChange={() => onToggleImportPath(index)}
                          className="mr-2 cursor-pointer"
                          title={importPath.enabled ? "Import path enabled" : "Import path disabled"}
                        />
                      </div>
                      <IconFolder size={20} strokeWidth={1.5} className="mr-2 text-neutral-500" />
                      <div className="flex">
                        <div className="text-xs text-nowrap">{importPath.path}</div>
                        {isInvalid && (
                          <span className="text-red-500 dark:text-red-400 text-xs flex items-center">
                            <IconAlertCircle size={16} strokeWidth={1.5} className="mx-1" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {(!collectionImportPaths || collectionImportPaths.length === 0) && (
        <div className="px-3 py-2">
          <div className="text-neutral-500 text-sm italic text-center py-2">
            No import paths configured in collection settings
          </div>
        </div>
      )}

      <div className="px-3 py-2">
        <button
          className="btn btn-sm btn-secondary w-full flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onBrowseImportPath(e);
          }}
        >
          <IconFileImport size={16} strokeWidth={1.5} className="mr-1" />
          Browse for Import Path
        </button>
      </div>
    </>
  );
};

export default ImportPathsTab;
