import React, { useState, useEffect, useRef, forwardRef, useCallback, useMemo } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { requestUrlChanged, updateRequestMethod, updateRequestProtoPath } from 'providers/ReduxStore/slices/collections';
import { saveRequest, browseFiles, loadGrpcMethodsFromReflection, openCollectionSettings, generateGrpcurlCommand } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { isMacOS } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';
import {
  IconX,
  IconCheck,
  IconRefresh,
  IconDeviceFloppy,
  IconArrowRight,
  IconCode,
  IconFile,
  IconChevronDown,
  IconSettings,
  IconAlertCircle,
  IconCopy
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
  IconGrpcBidiStreaming
} from 'components/Icons/GrpcMethods';
import Modal from 'components/Modal/index';
import CodeEditor from 'components/CodeEditor';

const getBasename = (filepath) => {
  if (!filepath) return '';
  return filepath.split(/[\\/]/).pop();
};

const GrpcurlModal = ({ isOpen, onClose, command }) => {
  const { displayedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const preferences = useSelector((state) => state.app.preferences);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success('Command copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy command');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      handleCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Generate gRPCurl Command</span>
          <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded">BETA</span>
        </div>
      }
      size="lg"
      hideFooter={true}
    >
      <div>
        <div className="flex w-full min-h-[400px]">
          <div className="flex-grow relative">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={handleCopy}
                className="btn btn-sm btn-secondary flex items-center gap-2"
              >
                {copied ? <IconCheck size={20} /> : <IconCopy size={20} />}
              </button>
            </div>
            <CodeEditor
              value={command}
              theme={displayedTheme}
              readOnly={true}
              mode="shell"
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

const GrpcQueryUrl = ({ item, collection, handleRun }) => {

  const { theme, storedTheme } = useTheme();
  const dispatch = useDispatch();
  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
  const type = item.draft ? get(item, 'draft.request.type') : get(item, 'request.type');
  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const protoPath = item.draft ? get(item, 'draft.request.protoPath') : get(item, 'request.protoPath');
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
  const [protoDropdownOpen, setProtoDropdownOpen] = useState(false);
  const methodDropdownRef = useRef();
  const protoDropdownRef = useRef();

  const [showGrpcurlModal, setShowGrpcurlModal] = useState(false);
  const [grpcurlCommand, setGrpcurlCommand] = useState('');

  // Get collection proto files from presets
  const collectionProtoFiles = get(collection, 'brunoConfig.presets.protoFiles', []);

  const fileExistsCache = useRef(new Map());

  const fileExists = useCallback((filePath) => {
    if (!filePath) return false;
    
    if (fileExistsCache.current.has(filePath)) {
      return fileExistsCache.current.get(filePath);
    }

    try {
      const absolutePath = window?.ipcRenderer?.resolvePath(filePath, collection.pathname);
      const exists = window?.ipcRenderer?.existsSync(absolutePath);
      fileExistsCache.current.set(filePath, exists);
      return exists;
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  }, [collection.pathname]);

  const collectionProtoFilesExistence = useMemo(() => {
    return collectionProtoFiles.map(protoFile => ({
      ...protoFile,
      exists: fileExists(protoFile.path)
    }));
  }, [collectionProtoFiles, fileExists]);

  const invalidProtoFiles = useMemo(() => {
    return collectionProtoFilesExistence.filter(file => !file.exists);
  }, [collectionProtoFilesExistence]);

  const currentProtoFileExists = useMemo(() => {
    return fileExists(protoFilePath);
  }, [protoFilePath, fileExists]);

  useEffect(() => {
    fileExistsCache.current.clear();
  }, [collection.pathname]);

  const onMethodDropdownCreate = (ref) => (methodDropdownRef.current = ref);
  const onProtoDropdownCreate = (ref) => (protoDropdownRef.current = ref);

  // Add a helper function to determine if the current method is a streaming method
  const isStreamingMethod = selectedGrpcMethod && selectedGrpcMethod.type && selectedGrpcMethod.type !== 'unary';

  const isClientStreamingMethod = selectedGrpcMethod && selectedGrpcMethod.type && (selectedGrpcMethod.type === 'client-streaming' || selectedGrpcMethod.type === 'bidi-streaming');

  useEffect(() => {
    if(protoFilePath) {
      loadMethodsFromProtoFile(protoFilePath);
      return;
    }
    if (!url) return;

    handleReflection(url);
  }, [url, protoFilePath]);

  const onSave = (finalValue) => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const onUrlChange = (value) => {
    if (!editorRef.current?.editor) return;
    const editor = editorRef.current.editor;
    const cursor = editor.getCursor();

    const finalUrl = value?.trim() ?? value;

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

  const handleReflection = async (url) => {
    if (!url) return;

    setIsLoadingMethods(true);
    try {
      const { methods, error } = await dispatch(loadGrpcMethodsFromReflection(item, collection.uid));

      if (error) {
        console.error('Error loading gRPC methods:', error);
        toast.error(`Failed to load gRPC methods: ${error.message || 'Unknown error'}`);
        return;
      }


      setGrpcMethods(methods);
      setProtoFilePath('');
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
      console.log('>>> result', result.command);

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
      <div ref={ref} className="flex items-center justify-center cursor-pointer select-none">
        <IconFile size={20} strokeWidth={1.5} className="mr-1 text-neutral-400" />
        <span className="text-xs dark:text-neutral-300 text-neutral-700 text-nowrap">
          {protoFilePath ? getBasename(protoFilePath) : 'Select Proto File'}
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
    if (!protoFile) return;

    // Get the absolute path from the relative path
    const absolutePath = window?.ipcRenderer?.resolvePath(protoFile.path, collection.pathname);
    
    // Check if the file exists
    const exists = fileExists(absolutePath);
    if (!exists) {
      toast.error(`Proto file not found: ${protoFile.path}`);
      return;
    }

    setProtoFilePath(protoFile.path);

    dispatch(updateRequestProtoPath({
      protoPath: protoFile.path,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
    
  };

  const handleResetProtoFile = () => {
    setProtoFilePath('');
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
    setProtoDropdownOpen(false);
    toast.success('Proto file reset');
  };

  const loadMethodsFromProtoFile = async (filePath) => {
    if (!filePath) return;
    const absolutePath = window?.ipcRenderer?.resolvePath(filePath, collection.pathname);

    setIsLoadingMethods(true);
    try {
      const { methods, error } = await loadGrpcMethodsFromProtoFile(absolutePath);

      if (error) {
        console.error('Error loading gRPC methods:', error);
        toast.error(`Failed to load gRPC methods: ${error.message || 'Unknown error'}`);
        return;
      }

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
      console.error('Error loading gRPC methods:', err);
      toast.error('Failed to load gRPC methods from proto file');
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const handleSelectProtoFile = (e) => {
    e.stopPropagation();

    const filters = [{ name: 'Proto Files', extensions: ['proto'] }];

    dispatch(browseFiles(filters, ['']))
      .then((filePaths) => {
        if (filePaths && filePaths.length > 0) {
          const filePath = filePaths[0];
          const relativePath = window?.ipcRenderer?.getRelativePath(filePath, collection.pathname);
          setProtoFilePath(relativePath);
    
          dispatch(updateRequestProtoPath({
            protoPath: relativePath,
            itemUid: item.uid,
            collectionUid: collection.uid
          }));
        }
      })
      .catch((err) => {
        console.error('Error selecting proto file:', err);
        toast.error('Failed to select proto file');
      });
  };

  const handleOpenCollectionPresets = () => {
    dispatch(openCollectionSettings(collection.uid, 'presets'));
  };


  return (
    <StyledWrapper className="flex items-center relative">
      <div className="flex items-center h-full method-selector-container">
        <div className="flex items-center justify-center h-full w-16">
          <span className="text-xs text-indigo-500 font-bold">gRPC</span>
        </div>
      </div>
      <div className="flex items-center w-full input-container h-full relative">
        <SingleLineEditor
          ref={editorRef}
          value={url}
          onSave={(finalValue) => onSave(finalValue)}
          theme={storedTheme}
          onChange={(newValue) => onUrlChange(newValue)}
          onRun={handleRun}
          collection={collection}
          highlightPathParams={true}
          item={item}
        />

        {grpcMethods && grpcMethods.length > 0 && (
          <div className="flex items-center h-full mr-2">
            <Dropdown onCreate={onMethodDropdownCreate} icon={<MethodsDropdownIcon />} placement="bottom-end" style={{ maxWidth: "unset" }}>
              <div className="max-h-96 overflow-y-auto max-w-96 min-w-60">
                {Object.entries(groupMethodsByService(grpcMethods)).map(([serviceName, methods], serviceIndex) => (
                  <div key={serviceIndex} className="service-group mb-2">
                    <div className="service-header px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-sm font-medium truncate sticky top-0 z-10">
                      {serviceName || 'Default Service'}
                    </div>
                    <div className="service-methods">
                      {methods.map((method, methodIndex) => (
                        <div
                          key={`${serviceIndex}-${methodIndex}`}
                          className={`dropdown-item py-2 ${
                            selectedGrpcMethod && selectedGrpcMethod.path === method.path
                              ? 'bg-indigo-100 dark:bg-indigo-900'
                              : ''
                          }`}
                          onClick={() => handleGrpcMethodSelect(method)}
                        >
                          <div className="flex items-center">
                            <div className="text-xs text-gray-500 mr-3">{getIconForMethodType(method.type)}</div>
                            <div className="flex flex-col">
                              <div className="font-medium">{method.methodName}</div>
                              <div className="text-xs text-gray-500">{method.type}</div>
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
              isOpen={protoDropdownOpen}
              onOpenChange={setProtoDropdownOpen}
            >
              <div className="proto-dropdown-menu max-h-fit overflow-y-auto">
                <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-sm font-medium">Select Proto File</h3>
                </div>

                {collectionProtoFiles && collectionProtoFiles.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-neutral-500">From Collection Settings</div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCollectionPresets();
                        }}
                        className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                      >
                        <IconSettings size={16} strokeWidth={1.5} />
                      </button>
                    </div>

                    {invalidProtoFiles.length > 0 && (
                      <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                        <p className="flex items-center">
                          <IconAlertCircle size={16} strokeWidth={1.5} className="mr-1" />
                          Some proto files could not be found. <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCollectionPresets();
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
                        const absolutePath = window?.ipcRenderer?.resolvePath(protoFile.path, collection.pathname);
                        const isSelected = protoFilePath === absolutePath;
                        const isInvalid = !fileExists(absolutePath);

                        return (
                          <div
                            key={`collection-proto-${index}`}
                            className={`dropdown-item py-1 px-2 ${
                              isSelected ? 'bg-indigo-100 dark:bg-indigo-900' : ''
                            } ${isInvalid ? 'opacity-60' : ''}`}
                            onClick={() => !isInvalid && handleSelectCollectionProtoFile(protoFile)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <IconFile size={20} strokeWidth={1.5} className="mr-2 text-neutral-500" />
                                <div className="flex flex-col">
                                  <div className="text-sm flex items-center">
                                    {getBasename(protoFile.path)}
                                    {isInvalid && (
                                      <span className="text-red-500 dark:text-red-400 text-xs flex items-center">
                                        <IconAlertCircle size={16} strokeWidth={1.5} className="mx-1 " />
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-neutral-500">{protoFile.path}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {collectionProtoFiles && collectionProtoFiles.length > 0 && (
                  <div className="border-t border-neutral-200 dark:border-neutral-700 my-1"></div>
                )}

                {protoFilePath && !collectionProtoFilesExistence.some(pf => 
                  window?.ipcRenderer?.resolvePath(pf.path, collection.pathname) === protoFilePath
                ) && (
                  <div className="px-3 py-2">
                    <div className="text-xs text-neutral-500 mb-1">Current Proto File</div>
                    {!currentProtoFileExists && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                        <p className="flex items-center">
                          <IconAlertCircle size={16} strokeWidth={1.5} className="mr-1" />
                          Selected proto file not found. Please select a valid proto file from collection settings or browse for a new one.
                        </p>
                      </div>
                    )}
                    <div className={`dropdown-item py-1 px-2 bg-indigo-100 dark:bg-indigo-900 ${!currentProtoFileExists ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <IconFile size={16} strokeWidth={1.5} className="mr-2 text-neutral-500" />
                          <div className="flex flex-col">
                            <div className="text-sm flex items-center">
                              {getBasename(protoFilePath)}
                              {!currentProtoFileExists && (
                                <span className="text-red-500 dark:text-red-400 text-xs flex items-center ml-1">
                                  <IconAlertCircle size={16} strokeWidth={1.5} />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">{protoFilePath}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetProtoFile();
                            }}
                          >
                            <IconX size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                 
                  </div>
                )}

                <div className="px-3 py-2">
                  <button
                    className="btn btn-sm btn-secondary w-full flex items-center justify-center"
                    onClick={(e) => {
                      handleSelectProtoFile(e);
                      setProtoDropdownOpen(false);
                    }}
                  >
                    <IconFile size={16} strokeWidth={1.5} className="mr-1" />
                    Browse for Proto File
                  </button>
                </div>
              </div>
            </Dropdown>
          </div>

          <div
            className="infotip"
            onClick={(e) => {
              e.stopPropagation();
              handleReflection(url);
            }}
          >
            <IconRefresh
              color={theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={`${isLoadingMethods ? 'animate-spin' : 'cursor-pointer'}`}
            />
            <span className="infotiptext text-xs">Refresh server reflection</span>
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
            <span className="infotiptext text-xs">Generate grpcurl command</span>
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
            <span className="infotiptext text-xs">
              Save <span className="shortcut">({saveShortcut})</span>
            </span>
          </div>

          {isConnectionActive && isStreamingMethod && (
            <div className="connection-controls relative flex items-center h-full gap-3">
              <div className="infotip" onClick={handleCancelConnection}>
                <IconX color={theme.requestTabs.icon.color} strokeWidth={1.5} size={22} className="cursor-pointer" />
                <span className="infotiptext text-xs">Cancel</span>
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
