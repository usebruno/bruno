import React, { useState, useEffect, useRef, forwardRef, useCallback, useMemo } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { requestUrlChanged, updateRequestMethod, updateRequestProtoPath } from 'providers/ReduxStore/slices/collections';
import { saveRequest, browseFiles, loadGrpcMethodsFromReflection, openCollectionSettings, generateGrpcurlCommand, updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { isMacOS } from 'utils/common/platform';
import { getRelativePath, getBasename, getAbsoluteFilePath } from 'utils/common/path';
import useLocalStorage from 'hooks/useLocalStorage/index';
import StyledWrapper from './StyledWrapper';
import ToggleSwitch from 'components/ToggleSwitch/index';
import {
  IconX,
  IconCheck,
  IconRefresh,
  IconDeviceFloppy,
  IconArrowRight,
  IconCode,
  IconFile,
  IconFolder,
  IconChevronDown,
  IconSettings,
  IconAlertCircle,
  IconCopy,
  IconFileImport
} from '@tabler/icons';
import toast from 'react-hot-toast';
import {
  loadGrpcMethodsFromProtoFile,
  cancelGrpcConnection,
  endGrpcConnection
} from 'utils/network/index';
import Dropdown from 'components/Dropdown/index';
import {
  IconGrpcUnary,
  IconGrpcClientStreaming,
  IconGrpcServerStreaming,
  IconGrpcBidiStreaming,
} from 'components/Icons/Grpc';
import GrpcurlModal from './GrpcurlModal';
import { debounce, cloneDeep } from 'lodash';
import { getPropertyFromDraftOrRequest } from 'utils/collections';
import { existsSync, isDirectory, browseDirectory } from 'utils/filesystem';

// Constants for gRPC method types
const STREAMING_METHOD_TYPES = ['client-streaming', 'server-streaming', 'bidi-streaming'];
const CLIENT_STREAMING_METHOD_TYPES = ['client-streaming', 'bidi-streaming'];


const GrpcQueryUrl = ({ item, collection, handleRun }) => {
  const { theme, storedTheme } = useTheme();
  const dispatch = useDispatch();
  const method = getPropertyFromDraftOrRequest(item, 'request.method');
  const type = getPropertyFromDraftOrRequest(item, 'request.type');
  const url = getPropertyFromDraftOrRequest(item, 'request.url', '');
  const protoPath = getPropertyFromDraftOrRequest(item, 'request.protoPath');
  const isMac = isMacOS();
  const saveShortcut = isMac ? 'Cmd + S' : 'Ctrl + S';
  const editorRef = useRef(null);
  const isConnectionActive = useSelector((state) => state.collections.activeConnections.includes(item.uid));
  const [protoFilePath, setProtoFilePath] = useState(protoPath);
  const [grpcMethods, setGrpcMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [selectedGrpcMethod, setSelectedGrpcMethod] = useState({
    path: method,
    type: type
  });
  const methodDropdownRef = useRef();
  const protoDropdownRef = useRef();
  const haveFetchedMethodsRef = useRef(false);
  const [showGrpcurlModal, setShowGrpcurlModal] = useState(false);
  const [grpcurlCommand, setGrpcurlCommand] = useState('');
  const [isReflectionMode, setIsReflectionMode] = useState(false);
  const collectionProtoFiles = get(collection, 'brunoConfig.protobuf.protoFiles', []);
  const collectionImportPaths = get(collection, 'brunoConfig.protobuf.importPaths', []);
  const [reflectionCache, setReflectionCache] = useLocalStorage('bruno.grpc.reflectionCache', {});
  const [protofileCache, setProtofileCache] = useLocalStorage('bruno.grpc.protofileCache', {});
  const fileExistsCache = useRef(new Map());
  const [showProtoDropdown, setShowProtoDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('protofiles'); // 'protofiles' or 'importpaths'

  const fileExists = useCallback(async (filePath) => {
    if (!filePath) return false;
    
    if (fileExistsCache.current.has(filePath)) {
      return fileExistsCache.current.get(filePath);
    }

    try {
      const absolutePath = getAbsoluteFilePath(filePath, collection.pathname);
      const exists = await existsSync(absolutePath);
      fileExistsCache.current.set(filePath, exists);
      return exists;
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  }, [collection.pathname]);

  const [collectionProtoFilesExistence, setCollectionProtoFilesExistence] = useState([]);
  const [collectionImportPathsExistence, setCollectionImportPathsExistence] = useState([]);

  useEffect(() => {
    const fetchCollectionProtoFilesExistence = async () => {
      if (!collectionProtoFiles) return;
      const existence = await Promise.all(collectionProtoFiles.map(async (protoFile) => {
        const absolutePath = getAbsoluteFilePath(protoFile.path, collection.pathname);
        const exists = await fileExists(absolutePath)
        return {
          path: protoFile.path,
          absolutePath,
          exists
        }
      }));
      setCollectionProtoFilesExistence(existence);
    };
    fetchCollectionProtoFilesExistence();
  }, [fileExists]);

  useEffect(() => {
    const fetchCollectionImportPathsExistence = async () => {
      if (!collectionImportPaths) return;
      const existence = await Promise.all(collectionImportPaths.map(async (importPath) => {
        const absolutePath = getAbsoluteFilePath(importPath.path, collection.pathname);
        const exists = await isDirectory(absolutePath);
        return {
          path: importPath.path,
          absolutePath,
          exists,
          enabled: importPath.enabled
        }
      }));
      setCollectionImportPathsExistence(existence);
    };
    fetchCollectionImportPathsExistence();
  }, [collection.pathname]);

  const invalidProtoFiles = useMemo(() => {
    return collectionProtoFilesExistence.filter(file => !file.exists);
  }, [collectionProtoFilesExistence]);

  const invalidImportPaths = useMemo(() => {
    return collectionImportPathsExistence.filter(path => !path.exists);
  }, [collectionImportPathsExistence]);

  const currentProtoFileExists = useMemo(() => {
    return fileExists(protoFilePath);
  }, [protoFilePath, fileExists]);

  const onMethodDropdownCreate = (ref) => (methodDropdownRef.current = ref);
  const onProtoDropdownCreate = (ref) => (protoDropdownRef.current = ref);


  const isStreamingMethod = selectedGrpcMethod && selectedGrpcMethod.type && STREAMING_METHOD_TYPES.includes(selectedGrpcMethod.type);
  const isClientStreamingMethod = selectedGrpcMethod && selectedGrpcMethod.type && CLIENT_STREAMING_METHOD_TYPES.includes(selectedGrpcMethod.type);

  const onSave = (finalValue) => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const onUrlChange = (value) => {
    if (!editorRef.current?.editor) return;
    const editor = editorRef.current.editor;
    const cursor = editor.getCursor();

    const finalUrl = value?.trim() || value;

    dispatch(
      requestUrlChanged({
        itemUid: item.uid,
        collectionUid: collection.uid,
        url: finalUrl
      })
    );

    // Restore cursor position only if URL was trimmed
    if (finalUrl !== value) {
      setTimeout(() => {
        if (editor) {
          editor.setCursor(cursor);
        }
      }, 0);
    }

    if(!protoFilePath && value) {
      setIsReflectionMode(true);
      handleReflection(finalUrl);
    }
  };

  const onMethodSelect = ({ path, type }) => {
    if (isConnectionActive) {
      cancelGrpcConnection(item.uid)
        .then(() => {
          toast.success('gRPC connection cancelled');
        })
        .catch((err) => {
          console.error('Failed to cancel gRPC connection:', err);
        });
    }

    dispatch(
      updateRequestMethod({
        method: path,
        methodType: type,
        itemUid: item.uid,
        collectionUid: collection.uid
        })
      ); 
  };

  const handleReflection = async (url, isManualRefresh = false) => {
    if (!url) return;

    const cachedMethods = reflectionCache[url];
    if (!isManualRefresh && cachedMethods && !isLoadingMethods) {
      setGrpcMethods(cachedMethods);
      setProtoFilePath('');
      setIsReflectionMode(true);
      const isDuplicateSave = !item.request.protoPath;
      if (!isDuplicateSave) {
        dispatch(updateRequestProtoPath({
          protoPath: '',
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      }

      if (cachedMethods && cachedMethods.length > 0) {
        const haveSelectedMethod =
          selectedGrpcMethod && cachedMethods.some((method) => method.path === selectedGrpcMethod.path);
        if (!haveSelectedMethod) {
          setSelectedGrpcMethod(null);
          onMethodSelect({ path: '', type: '' });
        } else if (selectedGrpcMethod) {
          // Update the method type for the currently selected method to ensure it matches
          const currentMethod = cachedMethods.find((method) => method.path === selectedGrpcMethod.path);
          if (currentMethod) {
            const methodType = currentMethod.type;
            setSelectedGrpcMethod({
              path: selectedGrpcMethod.path,
              type: methodType
            });
          }
        }
        return;
      }
    }

    setIsLoadingMethods(true);
    try {
      const { methods, error } = await dispatch(loadGrpcMethodsFromReflection(item, collection.uid, url));

      if (error) {
        console.error('Error loading gRPC methods:', error);
        toast.error(`Failed to load gRPC methods: ${error.message || 'Unknown error'}`);
        return;
      }

      // Cache the methods for this URL
      setReflectionCache(prevCache => ({
        ...prevCache,
        [url]: methods
      }));

      setGrpcMethods(methods);
      setProtoFilePath('');
      setIsReflectionMode(true);
      const isDuplicateSave = !item.request.protoPath;
      if (!isDuplicateSave) {
        dispatch(updateRequestProtoPath({
          protoPath: '',
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      }

      if (methods && methods.length > 0) {
        const haveSelectedMethod =
          selectedGrpcMethod && methods.some((method) => method.path === selectedGrpcMethod.path);
        if (!haveSelectedMethod) {
          setSelectedGrpcMethod(null);
          onMethodSelect({ path: '', type: '' });
        } else if (selectedGrpcMethod) {
          // Update the method type for the currently selected method to ensure it matches
          const currentMethod = methods.find((method) => method.path === selectedGrpcMethod.path);
          if (currentMethod) {
            const methodType = currentMethod.type;
            setSelectedGrpcMethod({
              path: selectedGrpcMethod.path,
              type: methodType
            });
          }
        }
        toast.success(`Loaded ${methods.length} gRPC methods from reflection`);
      }
    } catch (error) {
      console.error('Error loading gRPC methods:', error);
      toast.error('Failed to load gRPC methods from reflection');
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const handleGrpcurl = async (url) => {
    if (!url) {
      toast.error('Please enter a valid gRPC server URL');
      return;
    }

    if (!selectedGrpcMethod?.path) {
      toast.error('Please select a gRPC method');
      return;
    }

    try {
      const result = await dispatch(generateGrpcurlCommand(item, collection.uid));

      if (result.success) {
        setGrpcurlCommand(result.command);
        setShowGrpcurlModal(true);
      } else {
        toast.error(result.error || 'Failed to generate grpcurl command');
      }
    } catch (error) {
      console.error('Error generating grpcurl command:', error);
      toast.error('Failed to generate grpcurl command');
    }
  };

  // Add a new function to group methods by service
  const groupMethodsByService = (methods) => {
    if (!methods || !methods.length) return {};
    
    const groupedMethods = {};
    
    methods.forEach(method => {
      // The format is "/service.ServiceName/MethodName"
      const pathWithoutLeadingSlash = method.path.startsWith('/') ? method.path.slice(1) : method.path;
      const parts = pathWithoutLeadingSlash.split('/');
      
      // The service is the part before the last slash
      const serviceName = parts[0] || 'Default';
      // The method name is the part after the last slash
      const methodName = parts[1] || method.path;
      
      // Store the extracted method name for easier display
      const enhancedMethod = {
        ...method,
        serviceName,
        methodName
      };
      
      if (!groupedMethods[serviceName]) {
        groupedMethods[serviceName] = [];
      }
      
      groupedMethods[serviceName].push(enhancedMethod);
    });
    
    return groupedMethods;
  };

  const MethodsDropdownIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center ml-2 cursor-pointer select-none">
        {selectedGrpcMethod && <div className="mr-2">{getIconForMethodType(selectedGrpcMethod.type)}</div>}
        <span className="text-xs">
          {selectedGrpcMethod ? (
            <span className="dark:text-neutral-300 text-neutral-700 text-nowrap">
              {selectedGrpcMethod.path.split('.').at(-1) || selectedGrpcMethod.path}
            </span>
          ) : (
            <span className="dark:text-neutral-300 text-neutral-700 text-nowrap">Select Method </span>
          )}
        </span>
        <IconChevronDown className="caret ml-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const ProtoFileDropdownIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center cursor-pointer select-none" onClick={() => setShowProtoDropdown(prev => !prev)} data-test-id="grpc-proto-file-dropdown-icon">
        {isReflectionMode ? (<></>
        ) : (
          <IconFile size={20} strokeWidth={1.5} className="mr-1 text-neutral-400" />
        )}
        <span className="text-xs dark:text-neutral-300 text-neutral-700 text-nowrap">
          {isReflectionMode ? 'Using Reflection' : (protoFilePath ? getBasename(protoFilePath, collection.pathname) : 'Select Proto File')}
        </span>
        <IconChevronDown className="caret ml-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const handleGrpcMethodSelect = (method) => {
    const methodType = method.type
    setSelectedGrpcMethod({
      path: method.path,
      type: methodType
    });
    onMethodSelect({ path: method.path, type: methodType });
  };

  const getIconForMethodType = (type) => {
    switch (type) {
      case 'unary':
        return <IconGrpcUnary size={20} strokeWidth={2} />;
      case 'client-streaming':
        return <IconGrpcClientStreaming size={20} strokeWidth={2} />;
      case 'server-streaming':
        return <IconGrpcServerStreaming size={20} strokeWidth={2} />;
      case 'bidi-streaming':
        return <IconGrpcBidiStreaming size={20} strokeWidth={2} />;
      default:
        return <IconGrpcUnary size={20} strokeWidth={2} />;
    }
  };

  const handleCancelConnection = (e) => {
    e.stopPropagation();

    cancelGrpcConnection(item.uid)
      .then(() => {
        toast.success('gRPC connection cancelled');
      })
      .catch((err) => {
        console.error('Failed to cancel gRPC connection:', err);
        toast.error('Failed to cancel gRPC connection');
      });
  };

  const handleEndConnection = (e) => {
    e.stopPropagation();

    endGrpcConnection(item.uid)
      .then(() => {
        toast.success('gRPC stream ended');
      })
      .catch((err) => {
        console.error('Failed to end gRPC stream:', err);
        toast.error('Failed to end gRPC stream');
      });
  };

  const handleSelectCollectionProtoFile = (protoFile) => {
    try {
      if (!protoFile) {
        toast.error('No proto file selected');
        return;
      }

      // Get the absolute path from the relative path
      const absolutePath = protoFile.absolutePath;

      if (!protoFile.exists) {
        toast.error(`Proto file not found: ${protoFile.path}`);
        return;
      }

      setProtoFilePath(protoFile.path);
      setIsReflectionMode(false);

      dispatch(updateRequestProtoPath({
        protoPath: protoFile.path,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));

      loadMethodsFromProtoFile(absolutePath);
    } catch (error) {
      console.error('Error selecting collection proto file:', error);
      toast.error('Failed to select collection proto file');
    }
  };

  const handleResetProtoFile = () => {
    setProtoFilePath('');
    setIsReflectionMode(true);
    const isDuplicateSave = !item.request.protoPath;
    if (!isDuplicateSave) {
      dispatch(updateRequestProtoPath({
        protoPath: '',
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
    setGrpcMethods([]);
    setSelectedGrpcMethod(null);
    onMethodSelect({ path: '', type: '' });
    toast.success('Proto file reset');
  };

  const loadMethodsFromProtoFile = async (filePath, isManualRefresh = false) => {
    if (!filePath) {
      toast.error('No proto file selected');
      return;
    };
    const absolutePath = getAbsoluteFilePath(filePath, collection.pathname);

    // Check if we have cached methods for this proto file
    const cachedMethods = protofileCache[absolutePath];
    if (cachedMethods && !isLoadingMethods && !isManualRefresh) {
      setGrpcMethods(cachedMethods);
      
      if (cachedMethods && cachedMethods.length > 0) {
        // Check if currently selected method is still valid
        const haveSelectedMethod =
          selectedGrpcMethod && cachedMethods.some((method) => method.path === selectedGrpcMethod.path);
        if (!haveSelectedMethod) {
          setSelectedGrpcMethod(null);
          onMethodSelect({ path: '', type: '' });
        } else {
          // Update the method type for the currently selected method to ensure it matches
          const currentMethod = cachedMethods.find((method) => method.path === selectedGrpcMethod.path);
          if (currentMethod) {
            const methodType = currentMethod.type;
            setSelectedGrpcMethod({
              path: selectedGrpcMethod.path,
              type: methodType
            });
          }
        }
      }
      return;
    }

    setIsLoadingMethods(true);
    try {
      const { methods, error } = await loadGrpcMethodsFromProtoFile(absolutePath, collection);

      if (error) {
        setGrpcMethods([]);
        console.error('Error loading gRPC methods:', error);
        toast.error(`Failed to load gRPC methods: ${error.message || 'Unknown error'}`);
        return;
      }

      // Cache the methods for this proto file
      setProtofileCache(prevCache => ({
        ...prevCache,
        [absolutePath]: methods
      }));

      setGrpcMethods(methods);

      if (methods && methods.length > 0) {
        toast.success(`Loaded ${methods.length} gRPC methods from proto file`);

        // Check if currently selected method is still valid
        const haveSelectedMethod =
          selectedGrpcMethod && methods.some((method) => method.path === selectedGrpcMethod.path);
        if (!haveSelectedMethod) {
          setSelectedGrpcMethod(null);
          onMethodSelect({ path: '', type: '' });
        } else {
          // Update the method type for the currently selected method to ensure it matches
          const currentMethod = methods.find((method) => method.path === selectedGrpcMethod.path);
          if (currentMethod) {
            const methodType = currentMethod.type;
            setSelectedGrpcMethod({
              path: selectedGrpcMethod.path,
              type: methodType
            });
          }
        }
      } else {
        toast.warning('No gRPC methods found in proto file');
      }
    } catch (err) {
      setGrpcMethods([]);
      console.error('Error loading gRPC methods:', err);
      toast.error('Failed to load gRPC methods from proto file');
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const handleSelectProtoFile = async (e) => {
    e.stopPropagation();
    const filters = [{ name: 'Proto Files', extensions: ['proto'] }];

    try {
      const filePaths = await dispatch(browseFiles(filters, ['']));
      if (filePaths && filePaths.length > 0) {
        const filePath = filePaths[0];
        const relativePath = getRelativePath(filePath, collection.pathname);
        
        // Check if this proto file already exists in collection settings
        const existingProtoFiles = collectionProtoFiles;
        const exists = existingProtoFiles.some(pf => pf.path === relativePath);
        
        if (!exists) {
          // Add to collection settings
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
          toast.success(`Added proto file to collection: ${relativePath}`);
          
          // Refresh the proto files data
          setCollectionProtoFilesExistence(prev => [
            ...prev,
            {
              path: relativePath,
              absolutePath: filePath,
              exists: true
            }
          ]);
        } else {
          toast.info('Proto file already exists in collection settings');
        }
        
        // Set as current proto file and load methods
        setProtoFilePath(relativePath);
        setIsReflectionMode(false);
    
        dispatch(updateRequestProtoPath({
          protoPath: relativePath,
          itemUid: item.uid,
          collectionUid: collection.uid
        }));

        // Load methods from the newly selected proto file
        const absolutePath = getAbsoluteFilePath(relativePath, collection.pathname);
        loadMethodsFromProtoFile(absolutePath);
      }
    } catch (err) {
      console.error('Error selecting proto file:', err);
      toast.error('Failed to select proto file');
    }
  };

  const handleBrowseImportPath = async (e) => {
    e.stopPropagation();
    try {
      const selectedPath = await browseDirectory(collection.pathname);
      if (selectedPath) {
        const relativePath = getRelativePath(selectedPath, collection.pathname);
        const importPathObj = {
          path: relativePath,
          enabled: true
        };
        
        // Check if this path already exists
        const existingImportPaths = collectionImportPaths;
        const exists = existingImportPaths.some(ip => ip.path === importPathObj.path);
        
        if (exists) {
          toast.error('Import path already exists');
          return;
        }
        
        // Update the bruno config with the new import path
        const brunoConfig = cloneDeep(collection.brunoConfig);
        if (!brunoConfig.protobuf) {
          brunoConfig.protobuf = {};
        }
        if (!brunoConfig.protobuf.importPaths) {
          brunoConfig.protobuf.importPaths = [];
        }
        
        brunoConfig.protobuf.importPaths = [...collectionImportPaths, importPathObj];
        
        await dispatch(updateBrunoConfig(brunoConfig, collection.uid));
        toast.success(`Added import path: ${relativePath}`);
        
        // Refresh the import paths data
        setCollectionImportPathsExistence(prev => [
          ...prev,
          {
            path: relativePath,
            absolutePath: selectedPath,
            exists: true,
            enabled: true
          }
        ]);
      }
    } catch (error) {
      console.error('Error browsing for import path:', error);
      toast.error('Failed to browse for import path');
    }
  };

  const handleToggleImportPath = async (index) => {
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
      
      // Update local state
      setCollectionImportPathsExistence(prev => 
        prev.map((path, i) => 
          i === index 
            ? { ...path, enabled: !path.enabled }
            : path
        )
      );
      
      toast.success(`Import path ${updatedImportPaths[index].enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling import path:', error);
      toast.error('Failed to toggle import path');
    }
  };

  const handleOpenCollectionGrpc = () => {
    dispatch(openCollectionSettings(collection.uid, 'protobuf'));
  };

  const debouncedOnUrlChange = debounce(onUrlChange, 1000);

  useEffect(() => {
    fileExistsCache.current.clear();
  }, [collection.pathname]);

  useEffect(() => {
    if(haveFetchedMethodsRef.current) {
      return;
    }
    haveFetchedMethodsRef.current = true;

    if(protoFilePath) {
      setIsReflectionMode(false);
      loadMethodsFromProtoFile(protoFilePath);
      return;
    }
    if (!url) return;
    setIsReflectionMode(true);
    handleReflection(url);

  }, []);

  return (
    <StyledWrapper className="flex items-center relative" data-test-id="grpc-query-url-container">
      <div className="flex items-center h-full method-selector-container">
        <div className="flex items-center justify-center h-full w-16" data-test-id="grpc-method-indicator">
          <span className="text-xs text-indigo-500 font-bold">gRPC</span>
        </div>
      </div>
      <div className="flex items-center w-full input-container h-full relative">
        <SingleLineEditor
          ref={editorRef}
          value={url}
          onSave={(finalValue) => onSave(finalValue)}
          theme={storedTheme}
          onChange={(newValue) => debouncedOnUrlChange(newValue)}
          onRun={handleRun}
          collection={collection}
          highlightPathParams={true}
          item={item}
        />

        {grpcMethods && grpcMethods.length > 0 && (
          <div className="flex items-center h-full mr-2" data-test-id="grpc-methods-dropdown">
            <Dropdown onCreate={onMethodDropdownCreate} icon={<MethodsDropdownIcon />} placement="bottom-end" style={{ maxWidth: "unset" }}>
              <div className="max-h-96 overflow-y-auto max-w-96 min-w-60" data-test-id="grpc-methods-list">
                {Object.entries(groupMethodsByService(grpcMethods)).map(([serviceName, methods], serviceIndex) => (
                  <div key={serviceIndex} className="service-group mb-2">
                    <div className="service-header px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-sm font-medium truncate sticky top-0 z-10">
                      {serviceName || 'Default Service'}
                    </div>
                    <div className="service-methods">
                      {methods.map((method, methodIndex) => (
                        <div
                          key={`${serviceIndex}-${methodIndex}`}
                          className={`py-2 px-3 w-full border-l-2 transition-all duration-200 relative group ${
                            selectedGrpcMethod && selectedGrpcMethod.path === method.path
                              ? 'border-yellow-500 bg-yellow-500/20 dark:bg-yellow-900/20'
                              : 'border-transparent bg-transparent hover:border-yellow-500 hover:bg-yellow-500/20 dark:hover:bg-yellow-900/20'
                          }`}
                          onClick={() => handleGrpcMethodSelect(method)}
                          data-test-id="grpc-method-item"
                        >
                          <div className="flex items-center">
                            <div className="text-xs mr-3 text-gray-500">
                              {getIconForMethodType(method.type)}
                            </div>
                            <div className="flex flex-col flex-1">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {method.methodName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {method.type}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Dropdown>
          </div>
        )}
        <div className="flex items-center h-full mr-2 gap-3" id="send-request">
          <div className="proto-file-dropdown">
            <Dropdown
              onCreate={onProtoDropdownCreate}
              icon={<ProtoFileDropdownIcon />}
              placement="bottom-end"
              visible={showProtoDropdown}
              onClickOutside={() => setShowProtoDropdown(false)}
              data-test-id="grpc-proto-file-dropdown"
            >
              <div className="max-h-fit overflow-y-auto w-[30rem]">
               

                {/* Mode Toggle */}
                <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700" data-test-id="grpc-mode-toggle">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mode</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${!isReflectionMode ? 'font-medium' : 'text-neutral-500'}`} style={{ color: !isReflectionMode ? theme.colors.text.yellow : undefined }}>
                        Proto File
                      </span>
                      <ToggleSwitch
                        isOn={isReflectionMode}
                        handleToggle={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setIsReflectionMode(!isReflectionMode);
                          if (!isReflectionMode) {
                            // Switching to reflection mode
                            setProtoFilePath('');
                            dispatch(updateRequestProtoPath({
                              protoPath: '',
                              itemUid: item.uid,
                              collectionUid: collection.uid
                            }));
                            if (url) {
                              handleReflection(url);
                            }
                          } else {
                            // Switching to proto file mode
                            setGrpcMethods([]);
                            setSelectedGrpcMethod(null);
                            onMethodSelect({ path: '', type: '' });
                          }
                        }}
                        size="2xs"
                        activeColor={theme.colors.text.yellow}
                      />
                      <span className={`text-xs ${isReflectionMode ? 'font-medium' : 'text-neutral-500'}`} style={{ color: isReflectionMode ? theme.colors.text.yellow : undefined }}>
                        Reflection
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                {!isReflectionMode && (
                  <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                      <button
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          activeTab === 'protofiles'
                            ? 'bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab('protofiles');
                        }}
                      >
                        Proto Files ({collectionProtoFiles?.length || 0})
                      </button>
                      <button
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          activeTab === 'importpaths'
                            ? 'bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab('importpaths');
                        }}
                      >
                        Import Paths ({collectionImportPaths?.length || 0})
                      </button>
                    </div>
                  </div>
                )}

                {!isReflectionMode && (
                  <>
                    {/* Proto Files Tab Content */}
                    {activeTab === 'protofiles' && (
                      <>
                        {collectionProtoFiles && collectionProtoFiles.length > 0 && (
                      <div className="px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-neutral-500">From Collection Settings</div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCollectionGrpc();
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
                                  handleOpenCollectionGrpc();
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
                                    handleSelectCollectionProtoFile(protoFile);
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
                              handleSelectProtoFile(e);
                            }}
                          >
                            <IconFile size={16} strokeWidth={1.5} className="mr-1" />
                            Browse for Proto File
                          </button>
                        </div>
                      </>
                    )}

                    {/* Import Paths Tab Content */}
                    {activeTab === 'importpaths' && (
                      <>
                        {collectionImportPaths && collectionImportPaths.length > 0 && (
                          <div className="px-3 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs text-neutral-500">From Collection Settings</div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCollectionGrpc();
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
                                      handleOpenCollectionGrpc();
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
                                            onChange={() => handleToggleImportPath(index)}
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
                              handleBrowseImportPath(e);
                            }}
                          >
                            <IconFileImport size={16} strokeWidth={1.5} className="mr-1" />
                            Browse for Import Path
                          </button>
                        </div>
                      </>
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

          <div
            className="infotip"
            onClick={(e) => {
              e.stopPropagation();
              if (isReflectionMode) {
                handleReflection(url, true);
              } else if (protoFilePath) {
                loadMethodsFromProtoFile(protoFilePath, true);
              } else {
                toast.error('No proto file selected');
              }
            }}
          >
            <IconRefresh
              color={theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={`${isLoadingMethods ? 'animate-spin' : 'cursor-pointer'}`}
            />
            <span className="infotip-text text-xs">
              {isReflectionMode ? 'Refresh server reflection' : 'Refresh proto file methods'}
            </span>
          </div>

          <div
            className="infotip"
            onClick={(e) => {
              e.stopPropagation();
              handleGrpcurl(url);
            }}
          >
            <IconCode
              color={theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
            />
            <span className="infotip-text text-xs">Generate grpcurl command</span>
          </div>

          <div
            className="infotip"
            onClick={(e) => {
              e.stopPropagation();
              if (!item.draft) return;
              onSave();
            }}
          >
            <IconDeviceFloppy
              color={item.draft ? theme.colors.text.yellow : theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={`${item.draft ? 'cursor-pointer' : 'cursor-default'}`}
            />  
            <span className="infotip-text text-xs">
              Save <span className="shortcut">({saveShortcut})</span>
            </span>
          </div>

          {isConnectionActive && isStreamingMethod && (
            <div className="connection-controls relative flex items-center h-full gap-3">
              <div className="infotip" onClick={handleCancelConnection}>
                <IconX color={theme.requestTabs.icon.color} strokeWidth={1.5} size={22} className="cursor-pointer" />
                <span className="infotip-text text-xs">Cancel</span>
              </div>

            {isClientStreamingMethod && <div onClick={handleEndConnection}>
                <IconCheck
                  color={theme.colors.text.green}
                  strokeWidth={2}
                  size={22}
                  className="cursor-pointer"
                />
              </div>}
            </div>
          )}

          {(!isConnectionActive || !isStreamingMethod) && (
            <div
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleRun(e);
              }}
            >
              <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={22} />
            </div>
          )}
        </div>
      </div>
      {isConnectionActive && isStreamingMethod && (
        <div className="connection-status-strip"></div>
      )}

      {showGrpcurlModal && (
        <GrpcurlModal
          isOpen={showGrpcurlModal}
          onClose={() => setShowGrpcurlModal(false)}
          command={grpcurlCommand}
        />
      )}
    </StyledWrapper>
  );
};

export default GrpcQueryUrl;
