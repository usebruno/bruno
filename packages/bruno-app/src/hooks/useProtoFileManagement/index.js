import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { browseFiles, updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { getRelativePath, getAbsoluteFilePath } from 'utils/common/path';
import { existsSync, isDirectory, browseDirectory } from 'utils/filesystem';
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

  // State
  const [protofileCache, setProtofileCache] = useLocalStorage('bruno.grpc.protofileCache', {});
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const fileExistsCache = useRef(new Map());

  // Collection protofiles and import paths - memoized to prevent infinite loops
  const collectionProtoFiles = useMemo(() => collection?.brunoConfig?.protobuf?.protoFiles || [], [collection?.brunoConfig?.protobuf?.protoFiles]);
  const collectionImportPaths = useMemo(() => collection?.brunoConfig?.protobuf?.importPaths || [], [collection?.brunoConfig?.protobuf?.importPaths]);

  // File existence states - simplified to just path and exists
  const [protoFilesWithExistence, setProtoFilesWithExistence] = useState([]);
  const [importPathsWithExistence, setImportPathsWithExistence] = useState([]);

  // Check if file exists
  const fileExists = async filePath => {
    if (!filePath) return false;

    if (fileExistsCache.current.has(filePath)) {
      return fileExistsCache.current.get(filePath);
    }

    try {
      const absolutePath = getAbsoluteFilePath(collection.pathname, filePath);
      const exists = await existsSync(absolutePath);
      fileExistsCache.current.set(filePath, exists);
      return exists;
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  };

  // Load methods from protofile
  const loadMethodsFromProtoFile = async (filePath, isManualRefresh = false) => {
    if (!filePath) {
      return { methods: [], error: new Error('No proto file selected') };
    }

    const absolutePath = getAbsoluteFilePath(collection.pathname, filePath);

    // Check if we have cached methods for this proto file
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

      // Cache the methods for this proto file
      setProtofileCache(prevCache => ({
        ...prevCache,
        [absolutePath]: methods,
      }));

      return { methods, error: null };
    } catch (err) {
      console.error('Error loading gRPC methods:', err);
      return { methods: [], error: err };
    } finally {
      setIsLoadingMethods(false);
    }
  };

  // Add protofile to collection
  const addProtoFileToCollection = async filePath => {
    const relativePath = getRelativePath(collection.pathname, filePath);

    // Check if this proto file already exists in collection settings
    const exists = collectionProtoFiles.some(pf => pf.path === relativePath);

    if (exists) {
      return { success: true, relativePath, alreadyExists: true };
    }

    try {
      const protoFileObj = {
        path: relativePath,
        type: 'file',
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

  // Add import path to collection
  const addImportPathToCollection = async directoryPath => {
    const relativePath = getRelativePath(collection.pathname, directoryPath);
    const importPathObj = {
      path: relativePath,
      enabled: true,
    };

    // Check if this path already exists
    const exists = collectionImportPaths.some(ip => ip.path === importPathObj.path);

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

  // Toggle import path enabled/disabled
  const toggleImportPath = async index => {
    try {
      const updatedImportPaths = [...collectionImportPaths];
      updatedImportPaths[index] = {
        ...updatedImportPaths[index],
        enabled: !updatedImportPaths[index].enabled,
      };

      const brunoConfig = cloneDeep(collection.brunoConfig);
      if (!brunoConfig.protobuf) {
        brunoConfig.protobuf = {};
      }
      brunoConfig.protobuf.importPaths = updatedImportPaths;

      await dispatch(updateBrunoConfig(brunoConfig, collection.uid));

      return {
        success: true,
        enabled: updatedImportPaths[index].enabled,
      };
    } catch (error) {
      console.error('Error toggling import path:', error);
      return { success: false, error };
    }
  };

  // Browse for proto file
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

  // Browse for import directory
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

  // Fetch collection protofiles existence
  useEffect(() => {
    const fetchProtoFilesExistence = async () => {
      if (!collectionProtoFiles.length) {
        setProtoFilesWithExistence([]);
        return;
      }
      const existence = await Promise.all(collectionProtoFiles.map(async protoFile => {
        const exists = await fileExists(protoFile.path);
        return {
          path: protoFile.path,
          exists,
        };
      }));
      setProtoFilesWithExistence(existence);
    };
    fetchProtoFilesExistence();
  }, [collectionProtoFiles, collection.pathname]);

  // Fetch collection import paths existence
  useEffect(() => {
    const fetchImportPathsExistence = async () => {
      if (!collectionImportPaths.length) {
        setImportPathsWithExistence([]);
        return;
      }
      const existence = await Promise.all(collectionImportPaths.map(async importPath => {
        const absolutePath = getAbsoluteFilePath(collection.pathname, importPath.path);
        const exists = await isDirectory(absolutePath);
        return {
          path: importPath.path,
          exists,
          enabled: importPath.enabled,
        };
      }));
      setImportPathsWithExistence(existence);
    };
    fetchImportPathsExistence();
  }, [collectionImportPaths, collection.pathname]);

  // Clear file exists cache when collection changes
  useEffect(() => {
    fileExistsCache.current.clear();
  }, [collection.pathname]);

  return {
    // Data - simplified structures
    protoFiles: protoFilesWithExistence,
    importPaths: importPathsWithExistence,
    isLoadingMethods,

    // Actions
    loadMethodsFromProtoFile,
    addProtoFileToCollection,
    addImportPathToCollection,
    toggleImportPath,
    browseForProtoFile,
    browseForImportDirectory,
    fileExists,
  };
}
