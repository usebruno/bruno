import React, { useState, useEffect, useRef, forwardRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { requestUrlChanged, updateRequestMethod } from 'providers/ReduxStore/slices/collections';
import { saveRequest, browseFiles } from 'providers/ReduxStore/slices/collections/actions';
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
  IconChevronDown
} from '@tabler/icons';
import toast from 'react-hot-toast';
import {
  loadGrpcMethodsFromReflection,
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

// Utility function to get filename from path (replacement for path.basename)
const getBasename = (filepath) => {
  if (!filepath) return '';
  return filepath.split(/[\\/]/).pop();
};

const GrpcQueryUrl = ({ item, collection, handleRun }) => {
  const { theme, storedTheme } = useTheme();
  const dispatch = useDispatch();
  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
  const type = item.draft ? get(item, 'draft.request.type') : get(item, 'request.type');
  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const isMac = isMacOS();
  const saveShortcut = isMac ? 'Cmd + S' : 'Ctrl + S';
  const editorRef = useRef(null);

  const isConnectionActive = useSelector((state) => state.collections.activeConnections.has(item.uid));

  const [protoFilePath, setProtoFilePath] = useState('');
  const [grpcMethods, setGrpcMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [selectedGrpcMethod, setSelectedGrpcMethod] = useState({
    path: method,
    type: type
  });
  const [protoDropdownOpen, setProtoDropdownOpen] = useState(false);
  const methodDropdownRef = useRef();
  const protoDropdownRef = useRef();

  // Get collection proto files from presets
  const collectionProtoFiles = get(collection, 'brunoConfig.presets.protoFiles', []);

  const onMethodDropdownCreate = (ref) => (methodDropdownRef.current = ref);
  const onProtoDropdownCreate = (ref) => (protoDropdownRef.current = ref);

  // Add a helper function to determine if the current method is a streaming method
  const isStreamingMethod = () => {
    return selectedGrpcMethod && selectedGrpcMethod.type && selectedGrpcMethod.type !== 'UNARY';
  };

  useEffect(() => {
    const isValidGrpcUrl = (url) => {
      return (
        url &&
        (url.startsWith('grpc://') ||
          url.startsWith('grpcs://') ||
          url.startsWith('http://') ||
          url.startsWith('https://') ||
          url.startsWith('unix:'))
      );
    };

    if (isValidGrpcUrl(url) && !protoFilePath) {
      handleReflection(url);
    }
  }, [url, protoFilePath]);

  // Load proto file when selected
  useEffect(() => {
    if (protoFilePath) {
      loadMethodsFromProtoFile(protoFilePath);
    }
  }, [protoFilePath]);

  // Check if file exists
  const fileExists = (filePath) => {
    console.log('fileExists', filePath);
    try {
      if (!filePath) return false;
      console.log('window?.ipcRenderer', window?.ipcRenderer, window?.ipcRenderer?.fileExists, filePath);
      return window?.ipcRenderer?.fileExists(filePath);
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  };

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
      const { methods, error } = await loadGrpcMethodsFromReflection(url, null, null, null, {
        rejectUnauthorized: false
      });
      setGrpcMethods(methods);
      setProtoFilePath('');

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
            const methodType = getMethodType(currentMethod);
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
    const methodType = getMethodType(method);
    setSelectedGrpcMethod({
      path: method.path,
      type: methodType
    });
    onMethodSelect({ path: method.path, type: methodType });
  };

  const getIconForMethodType = (type) => {
    switch (type) {
      case 'UNARY':
        return <IconGrpcUnary size={20} strokeWidth={2} />;
      case 'CLIENT-STREAMING':
        return <IconGrpcClientStreaming size={20} strokeWidth={2} />;
      case 'SERVER-STREAMING':
        return <IconGrpcServerStreaming size={20} strokeWidth={2} />;
      case 'BIDI-STREAMING':
        return <IconGrpcBidiStreaming size={20} strokeWidth={2} />;
      default:
        return <IconGrpcUnary size={20} strokeWidth={2} />;
    }
  };

  const getMethodType = (method) => {
    switch (method.type) {
      case 'UNARY':
        return 'UNARY';
      case 'CLIENT-STREAMING':
        return 'CLIENT-STREAMING';
      case 'SERVER-STREAMING':
        return 'SERVER-STREAMING';
      case 'BIDI-STREAMING':
        return 'BIDI-STREAMING';
      default:
        return 'UNARY';
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

  const loadMethodsFromProtoFile = async (filePath) => {
    if (!filePath) return;

    setIsLoadingMethods(true);
    try {
      const { methods, error } = await loadGrpcMethodsFromProtoFile(filePath);

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
          setProtoFilePath(filePath);
        }
      })
      .catch((err) => {
        console.error('Error selecting proto file:', err);
        toast.error('Failed to select proto file');
      });
  };

  const handleSelectCollectionProtoFile = (absolutePath) => {
    if (!absolutePath) return;

    // Check if the file exists
    const exists = fileExists(absolutePath);
    if (!exists) {
      toast.error(`Proto file not found: ${absolutePath}`);
      return;
    }

    setProtoFilePath(absolutePath);
  };

  return (
    <StyledWrapper className="flex items-center">
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
            <Dropdown onCreate={onMethodDropdownCreate} icon={<MethodsDropdownIcon />} placement="bottom-start">
              <div className="max-h-96 overflow-y-auto">
                {grpcMethods.map((method, index) => (
                  <div
                    key={index}
                    className={`dropdown-item ${
                      selectedGrpcMethod && selectedGrpcMethod.path === method.path
                        ? 'bg-indigo-100 dark:bg-indigo-900'
                        : ''
                    }`}
                    onClick={() => handleGrpcMethodSelect(method)}
                  >
                    <div className="text-xs text-gray-500 mr-3">{getIconForMethodType(method.type)}</div>
                    <div>{method.path.split('.').at(-1) || method.path}</div>
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
              placement="bottom-start"
              isOpen={protoDropdownOpen}
              onOpenChange={setProtoDropdownOpen}
            >
              <div className="proto-dropdown-menu max-h-96 overflow-y-auto">
                <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-sm font-medium">Select Proto File</h3>
                </div>

                {collectionProtoFiles && collectionProtoFiles.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="text-xs text-neutral-500 mb-1">From Collection Settings</div>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {collectionProtoFiles.map((file, index) => {
                        const isSelected = protoFilePath === file;

                        return (
                          <div
                            key={`collection-proto-${index}`}
                            className={`dropdown-item py-1 px-2 ${
                              isSelected ? 'bg-indigo-100 dark:bg-indigo-900' : ''
                            }`}
                            onClick={() => handleSelectCollectionProtoFile(file)}
                          >
                            <div className="flex items-center">
                              <IconFile size={20} strokeWidth={1.5} className="mr-2 text-neutral-500" />
                              <div className="flex flex-col">
                                <div className="text-sm">{getBasename(file)}</div>
                                <div className="text-xs text-neutral-500">{file}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="border-t border-neutral-200 dark:border-neutral-700 my-1"></div>

                {protoFilePath && !collectionProtoFiles.includes(protoFilePath) && (
                  <div className="px-3 py-2">
                    <div className="text-xs text-neutral-500 mb-1">Current Proto File</div>
                    <div className="dropdown-item py-1 px-2 bg-indigo-100 dark:bg-indigo-900">
                      <div className="flex items-center">
                        <IconFile size={16} strokeWidth={1.5} className="mr-2 text-neutral-500" />
                        <div className="flex flex-col">
                          <div className="text-sm">{getBasename(protoFilePath)}</div>
                          <div className="text-xs text-neutral-500">{protoFilePath}</div>
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

          {isConnectionActive && isStreamingMethod() && (
            <div className="connection-controls relative flex items-center h-full gap-3">
              <div className="infotip" onClick={handleCancelConnection}>
                <IconX color={theme.requestTabs.icon.color} strokeWidth={1.5} size={22} className="cursor-pointer" />
                <span className="infotiptext text-xs">Cancel</span>
              </div>

              <div className="infotip" onClick={handleEndConnection}>
                <IconCheck
                  color={theme.requestTabs.icon.color}
                  strokeWidth={1.5}
                  size={22}
                  className="cursor-pointer"
                />
                <span className="infotiptext text-xs">End</span>
              </div>

              <div className="connection-status-strip absolute bottom-0 left-0 right-0 h-0.5  bg-green-500"></div>
            </div>
          )}

          {(!isConnectionActive || !isStreamingMethod()) && (
            <div
              className="infotip cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleRun(e);
              }}
            >
              <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={22} />
              <span className="infotiptext text-xs">Send Request</span>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GrpcQueryUrl;
