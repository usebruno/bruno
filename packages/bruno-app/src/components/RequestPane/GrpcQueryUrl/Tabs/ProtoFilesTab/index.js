import React from 'react';
import { IconFile, IconSettings, IconAlertCircle } from '@tabler/icons';
import { getBasename } from 'utils/common/path';

const ProtoFilesTab = ({
  collectionProtoFiles,
  collectionProtoFilesExistence,
  invalidProtoFiles,
  protoFilePath,
  collection,
  onSelectCollectionProtoFile,
  onOpenCollectionGrpc,
  onSelectProtoFile,
  setShowProtoDropdown
}) => {
  return (
    <>
      {collectionProtoFiles && collectionProtoFiles.length > 0 && (
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

          {invalidProtoFiles.length > 0 && (
            <div className="mb-2 p-2 bg-transparent rounded text-xs text-red-600 dark:text-red-400">
              <p className="flex items-center">
                <IconAlertCircle size={16} strokeWidth={1.5} className="mr-1" />
                Some proto files could not be found. <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCollectionGrpc();
                  }}
                  className="text-red-600 dark:text-red-400 underline hover:text-red-700 dark:hover:text-red-300 ml-1"
                >
                  Manage proto files
                </button>
              </p>
            </div>
          )}

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {collectionProtoFilesExistence.map((protoFile, index) => {
              const isSelected = protoFilePath === protoFile.path;
              const isInvalid = !protoFile.exists;

              return (
                <div
                  key={`collection-proto-${index}`}
                  className={`py-2 px-3 cursor-pointer border-l-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-yellow-500 bg-yellow-500/20 dark:bg-yellow-900/20' 
                      : 'border-transparent hover:border-yellow-500 hover:bg-yellow-500/20 dark:hover:bg-yellow-900/20'
                  } ${isInvalid ? 'opacity-60' : ''}`}
                  onClick={() => {
                    if (!isInvalid) {
                      setShowProtoDropdown(false);
                      onSelectCollectionProtoFile(protoFile);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <IconFile size={20} strokeWidth={1.5} className="mr-3 text-neutral-500" />
                    <div className="flex flex-col">
                      <div className="text-sm flex items-center">
                        {getBasename(protoFile.path, collection.pathname)}
                        {isInvalid && (
                          <span className="text-red-500 dark:text-red-400 text-xs flex items-center ml-2">
                            <IconAlertCircle size={14} strokeWidth={1.5} />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 truncate max-w-[200px]">
                        {protoFile.path}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(!collectionProtoFiles || collectionProtoFiles.length === 0) && (
        <div className="px-3 py-2">
          <div className="text-neutral-500 text-sm italic text-center py-2">
            No proto files configured in collection settings
          </div>
        </div>
      )}

      <div className="px-3 py-2">
        <button
          className="btn btn-sm btn-secondary w-full flex items-center justify-center"
          onClick={(e) => {
            onSelectProtoFile(e);
          }}
        >
          <IconFile size={16} strokeWidth={1.5} className="mr-1" />
          Browse for Proto File
        </button>
      </div>
    </>
  );
};

export default ProtoFilesTab;
