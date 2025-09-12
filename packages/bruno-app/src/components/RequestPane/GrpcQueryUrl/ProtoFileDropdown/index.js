import React, { forwardRef, useState } from 'react';
import { IconFile, IconChevronDown } from '@tabler/icons';
import { getBasename } from 'utils/common/path';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { updateRequestProtoPath } from 'providers/ReduxStore/slices/collections';
import { openCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import Dropdown from 'components/Dropdown/index';
import ToggleSwitch from 'components/ToggleSwitch/index';
import { TabNavigation, ProtoFilesTab, ImportPathsTab } from '../Tabs';
import useProtoFileManagement from 'hooks/useProtoFileManagement/index';

const ProtoFileDropdown = ({
  collection,
  item,
  isReflectionMode,
  protoFilePath,
  showProtoDropdown,
  setShowProtoDropdown,
  onProtoDropdownCreate,
  onReflectionModeToggle,
  onProtoFileLoad,
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('protofiles'); // 'protofiles' or 'importpaths'
  const protoFileManagement = useProtoFileManagement(collection, protoFilePath);
  const invalidProtoFiles = protoFileManagement.protoFiles.filter(file => !file.exists);
  const invalidImportPaths = protoFileManagement.importPaths.filter(path => !path.exists);

  const handleSelectProtoFile = async e => {
    e.stopPropagation();
    const { success, filePath, error } = await protoFileManagement.browseForProtoFile();
    if (!success) {
      if (error) {
        toast.error(`Failed to browse for proto file: ${error.message}`);
      }
      return;
    }

    const { success: addSuccess, relativePath, alreadyExists, error: addError } = await protoFileManagement.addProtoFileToCollection(filePath);
    if (!addSuccess) {
      if (addError) {
        toast.error(`Failed to add proto file: ${addError.message}`);
      }
      return;
    }

    if (alreadyExists) {
      toast.error('Proto file already exists in collection settings');
    } else {
      toast.success('Added proto file to collection');
    }

    dispatch(updateRequestProtoPath({
      protoPath: relativePath,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));

    setShowProtoDropdown(false);

    onProtoFileLoad(relativePath);
  };

  const handleSelectCollectionProtoFile = protoFile => {
    if (!protoFile || !protoFile.exists) {
      toast.error('Proto file not found');
      return;
    }

    setShowProtoDropdown(false);

    dispatch(updateRequestProtoPath({
      protoPath: protoFile.path,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));

    onProtoFileLoad(protoFile.path);
  };

  const handleBrowseImportPath = async e => {
    e.stopPropagation();
    const { success, directoryPath, error } = await protoFileManagement.browseForImportDirectory();
    if (!success) {
      if (error) {
        toast.error(`Failed to browse for import directory: ${error.message}`);
      }
      return;
    }

    const { success: addSuccess, error: addError } = await protoFileManagement.addImportPathToCollection(directoryPath);
    if (!addSuccess) {
      if (addError) {
        toast.error(`Failed to add import path: ${addError.message}`);
      }
      return;
    }

    toast.success('Added import path to collection');
  };

  const handleToggleImportPath = async index => {
    const { success, enabled, error } = await protoFileManagement.toggleImportPath(index);
    if (!success) {
      if (error) {
        toast.error(`Failed to toggle import path: ${error.message}`);
      }
      return;
    }

    toast.success(`Import path ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleOpenCollectionProtobufSettings = e => {
    e.stopPropagation();
    dispatch(openCollectionSettings(collection.uid, 'protobuf'));
  };

  const ProtoFileDropdownIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center cursor-pointer select-none" onClick={() => setShowProtoDropdown(prev => !prev)} data-testid="grpc-proto-file-dropdown-icon">
        {isReflectionMode ? (<></>
        ) : (
          <IconFile size={20} strokeWidth={1.5} className="mr-1 text-neutral-400" />
        )}
        <span className="text-xs dark:text-neutral-300 text-neutral-700 text-nowrap">
          {isReflectionMode ? 'Using Reflection' : (protoFilePath ? getBasename(collection.pathname, protoFilePath) : 'Select Proto File')}
        </span>
        <IconChevronDown className="caret ml-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <div className="proto-file-dropdown">
      <Dropdown
        onCreate={onProtoDropdownCreate}
        icon={<ProtoFileDropdownIcon />}
        placement="bottom-end"
        visible={showProtoDropdown}
        onClickOutside={() => setShowProtoDropdown(false)}
        data-testid="grpc-proto-file-dropdown"
      >
        <div className="max-h-fit overflow-y-auto w-[30rem]">
          <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700" data-testid="grpc-mode-toggle">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mode</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${!isReflectionMode ? 'font-medium' : 'text-neutral-500'}`} style={{ color: !isReflectionMode ? theme.colors.text.yellow : undefined }}>
                  Proto File
                </span>
                <ToggleSwitch
                  isOn={isReflectionMode}
                  handleToggle={onReflectionModeToggle}
                  size="2xs"
                  activeColor={theme.colors.text.yellow}
                />
                <span className={`text-xs ${isReflectionMode ? 'font-medium' : 'text-neutral-500'}`} style={{ color: isReflectionMode ? theme.colors.text.yellow : undefined }}>
                  Reflection
                </span>
              </div>
            </div>
          </div>

          {!isReflectionMode && (
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              collectionProtoFiles={protoFileManagement.protoFiles}
              collectionImportPaths={protoFileManagement.importPaths}
            />
          )}

          {!isReflectionMode && (
            <>
              {activeTab === 'protofiles' && (
                <ProtoFilesTab
                  collectionProtoFiles={protoFileManagement.protoFiles}
                  invalidProtoFiles={invalidProtoFiles}
                  protoFilePath={protoFilePath}
                  collection={collection}
                  onSelectCollectionProtoFile={handleSelectCollectionProtoFile}
                  onOpenCollectionProtobufSettings={handleOpenCollectionProtobufSettings}
                  onSelectProtoFile={handleSelectProtoFile}
                  setShowProtoDropdown={setShowProtoDropdown}
                />
              )}

              {activeTab === 'importpaths' && (
                <ImportPathsTab
                  collectionImportPaths={protoFileManagement.importPaths}
                  invalidImportPaths={invalidImportPaths}
                  onOpenCollectionProtobufSettings={handleOpenCollectionProtobufSettings}
                  onBrowseImportPath={handleBrowseImportPath}
                  onToggleImportPath={handleToggleImportPath}
                />
              )}
            </>
          )}

          {isReflectionMode && (
            <div className="px-3 py-2">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                Using server reflection to discover gRPC methods.
              </div>
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  );
};

export default ProtoFileDropdown;
