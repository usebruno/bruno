import { useState, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { browseFiles, updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { getRelativePath, getAbsoluteFilePath } from 'utils/common/path';
import { browseDirectory } from 'utils/filesystem';
import { loadGrpcMethodsFromProtoFile } from 'utils/network/index';
import useLocalStorage from 'hooks/useLocalStorage/index';
import { cloneDeep } from 'lodash';

/**
 * Custom hook for managing protofile data and collection configuration
 * @param {Object} collection - The collection object
 * @param {string} currentProtoPath - Currently selected proto file path
 */
export default function useProtoFileManagement(collection) {
  const dispatch = useDispatch();

  const [protofileCache, setProtofileCache] = useLocalStorage('bruno.grpc.protofileCache', {});
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);

  const collectionProtoFiles = useMemo(() => collection?.brunoConfig?.protobuf?.protoFiles || [], [collection?.brunoConfig?.protobuf?.protoFiles]);
  const collectionImportPaths = useMemo(() => collection?.brunoConfig?.protobuf?.importPaths || [], [collection?.brunoConfig?.protobuf?.importPaths]);

  const protoFilesWithExistence = useMemo(() =>
    collectionProtoFiles.map((protoFile) => ({
      path: protoFile.path,
      exists: protoFile.exists || false
    })), [collectionProtoFiles]);

  const importPathsWithExistence = useMemo(() =>
    collectionImportPaths.map((importPath) => ({
      path: importPath.path,
      exists: importPath.exists || false,
      enabled: importPath.enabled || false
    })), [collectionImportPaths]);

  const loadMethodsFromProtoFile = async (filePath, isManualRefresh = false) => {
    if (!filePath) {
      return { methods: [], error: new Error('No proto file selected') };
    }

    const absolutePath = getAbsoluteFilePath(collection.pathname, filePath);

    const cachedMethods = protofileCache[absolutePath];
    if (cachedMethods && !isLoadingMethods && !isManualRefresh) {
      return { methods: cachedMethods, error: null };
    }

    setIsLoadingMethods(true);
    try {
      const { methods, error } = await loadGrpcMethodsFromProtoFile(absolutePath, collection);

      if (error) {
        console.error('Error loading gRPC methods:', error);
        return { methods: [], error };
      }

      setProtofileCache((prevCache) => ({
        ...prevCache,
        [absolutePath]: methods
      }));

      return { methods, error: null };
    } catch (err) {
      console.error('Error loading gRPC methods:', err);
      return { methods: [], error: err };
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const addProtoFileToCollection = async (filePath) => {
    const relativePath = getRelativePath(collection.pathname, filePath, true);

    const exists = collectionProtoFiles.some((pf) => pf.path === relativePath);

    if (exists) {
      return { success: true, relativePath, alreadyExists: true };
    }

    try {
      const protoFileObj = {
        path: relativePath,
        type: 'file'
      };

      const brunoConfig = cloneDeep(collection.brunoConfig);
      if (!brunoConfig.protobuf) {
        brunoConfig.protobuf = {};
      }
      if (!brunoConfig.protobuf.protoFiles) {
        brunoConfig.protobuf.protoFiles = [];
      }

      brunoConfig.protobuf.protoFiles = [...collectionProtoFiles, protoFileObj];

      await dispatch(updateBrunoConfig(brunoConfig, collection.uid));

      return { success: true, relativePath };
    } catch (error) {
      console.error('Error adding proto file to collection:', error);
      return { success: false, error };
    }
  };

  const addImportPathToCollection = async (directoryPath) => {
    const relativePath = getRelativePath(collection.pathname, directoryPath, true);
    const importPathObj = {
      path: relativePath,
      enabled: true
    };

    const exists = collectionImportPaths.some((ip) => ip.path === importPathObj.path);

    if (exists) {
      return { success: false, error: new Error('Import path already exists') };
    }

    try {
      const brunoConfig = cloneDeep(collection.brunoConfig);
      if (!brunoConfig.protobuf) {
        brunoConfig.protobuf = {};
      }
      if (!brunoConfig.protobuf.importPaths) {
        brunoConfig.protobuf.importPaths = [];
      }

      brunoConfig.protobuf.importPaths = [...collectionImportPaths, importPathObj];

      await dispatch(updateBrunoConfig(brunoConfig, collection.uid));

      return { success: true, relativePath };
    } catch (error) {
      console.error('Error adding import path:', error);
      return { success: false, error };
    }
  };

  const toggleImportPath = async (index) => {
    try {
      const updatedImportPaths = [...collectionImportPaths];
      updatedImportPaths[index] = {
        ...updatedImportPaths[index],
        enabled: !updatedImportPaths[index].enabled
      };

      const brunoConfig = cloneDeep(collection.brunoConfig);
      if (!brunoConfig.protobuf) {
        brunoConfig.protobuf = {};
      }
      brunoConfig.protobuf.importPaths = updatedImportPaths;

      await dispatch(updateBrunoConfig(brunoConfig, collection.uid));

      return {
        success: true,
        enabled: updatedImportPaths[index].enabled
      };
    } catch (error) {
      console.error('Error toggling import path:', error);
      return { success: false, error };
    }
  };

  const browseForProtoFile = async () => {
    const filters = [{ name: 'Proto Files', extensions: ['proto'] }];

    try {
      const filePaths = await dispatch(browseFiles(filters, ['']));
      if (filePaths && filePaths.length > 0) {
        return { success: true, filePath: filePaths[0] };
      }
      return { success: false, error: new Error('No file selected') };
    } catch (error) {
      console.error('Error browsing for proto file:', error);
      return { success: false, error };
    }
  };

  const browseForImportDirectory = async () => {
    try {
      const selectedPath = await browseDirectory(collection.pathname);
      if (selectedPath) {
        return { success: true, directoryPath: selectedPath };
      }
      return { success: false, error: new Error('No directory selected') };
    } catch (error) {
      console.error('Error browsing for import directory:', error);
      return { success: false, error };
    }
  };

  const removeProtoFileFromCollection = async (index) => {
    try {
      const updatedProtoFiles = [...collectionProtoFiles];
      updatedProtoFiles.splice(index, 1);

      const brunoConfig = cloneDeep(collection.brunoConfig);
      if (!brunoConfig.protobuf) {
        brunoConfig.protobuf = {};
      }
      brunoConfig.protobuf.protoFiles = updatedProtoFiles;

      await dispatch(updateBrunoConfig(brunoConfig, collection.uid));

      return { success: true };
    } catch (error) {
      console.error('Error removing proto file:', error);
      return { success: false, error };
    }
  };

  const removeImportPathFromCollection = async (index) => {
    try {
      const updatedImportPaths = [...collectionImportPaths];
      updatedImportPaths.splice(index, 1);

      const brunoConfig = cloneDeep(collection.brunoConfig);
      if (!brunoConfig.protobuf) {
        brunoConfig.protobuf = {};
      }
      brunoConfig.protobuf.importPaths = updatedImportPaths;

      await dispatch(updateBrunoConfig(brunoConfig, collection.uid));

      return { success: true };
    } catch (error) {
      console.error('Error removing import path:', error);
      return { success: false, error };
    }
  };

  const replaceImportPathInCollection = async (index, newDirectoryPath) => {
    try {
      const relativePath = getRelativePath(collection.pathname, newDirectoryPath, true);
      const updatedImportPaths = [...collectionImportPaths];
      updatedImportPaths[index] = {
        ...updatedImportPaths[index],
        path: relativePath
      };

      const brunoConfig = cloneDeep(collection.brunoConfig);
      if (!brunoConfig.protobuf) {
        brunoConfig.protobuf = {};
      }
      brunoConfig.protobuf.importPaths = updatedImportPaths;

      await dispatch(updateBrunoConfig(brunoConfig, collection.uid));

      return { success: true };
    } catch (error) {
      console.error('Error replacing import path:', error);
      return { success: false, error };
    }
  };

  const replaceProtoFileInCollection = async (index, newFilePath) => {
    try {
      const relativePath = getRelativePath(collection.pathname, newFilePath, true);
      const updatedProtoFiles = [...collectionProtoFiles];
      updatedProtoFiles[index] = {
        ...updatedProtoFiles[index],
        path: relativePath,
        type: 'file'
      };

      const brunoConfig = cloneDeep(collection.brunoConfig);
      if (!brunoConfig.protobuf) {
        brunoConfig.protobuf = {};
      }
      brunoConfig.protobuf.protoFiles = updatedProtoFiles;

      await dispatch(updateBrunoConfig(brunoConfig, collection.uid));

      return { success: true };
    } catch (error) {
      console.error('Error replacing proto file:', error);
      return { success: false, error };
    }
  };

  return {
    protoFiles: protoFilesWithExistence,
    importPaths: importPathsWithExistence,
    isLoadingMethods,
    loadMethodsFromProtoFile,
    addProtoFileToCollection,
    addImportPathToCollection,
    toggleImportPath,
    browseForProtoFile,
    browseForImportDirectory,
    removeProtoFileFromCollection,
    removeImportPathFromCollection,
    replaceImportPathInCollection,
    replaceProtoFileInCollection
  };
}
