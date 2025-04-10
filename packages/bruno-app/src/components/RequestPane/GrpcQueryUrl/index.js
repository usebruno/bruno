import React, { useState, useEffect, useRef, forwardRef } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { requestUrlChanged, updateRequestMethod } from 'providers/ReduxStore/slices/collections';
import { saveRequest, browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import { IconDeviceFloppy, IconArrowRight, IconCode, IconFile, IconChevronDown } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import { isMacOS } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';
import GenerateCodeItem from 'components/Sidebar/Collections/Collection/CollectionItem/GenerateCodeItem/index';
import { IconLoader2, IconX ,IconCheck, IconRefresh } from '@tabler/icons';
import toast from 'react-hot-toast';
import { loadGrpcMethodsFromReflection, loadGrpcMethodsFromProtoFile, cancelGrpcConnection, endGrpcConnection, isGrpcConnectionActive } from 'utils/network/index';
import Dropdown from 'components/Dropdown/index';
import { IconGrpcUnary, IconGrpcClientStreaming, IconGrpcServerStreaming, IconGrpcBidiStreaming } from 'components/Icons/GrpcMethods';

const GrpcQueryUrl = ({ item, collection, handleRun, isConnectionAlive = false, setIsConnectionAlive }) => {
  const { theme, storedTheme } = useTheme();
  const dispatch = useDispatch();
  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
  const type = item.draft ? get(item, 'draft.request.type') : get(item, 'request.type');
  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const isMac = isMacOS();
  const saveShortcut = isMac ? 'Cmd + S' : 'Ctrl + S';
  const editorRef = useRef(null);

  const [methodSelectorWidth, setMethodSelectorWidth] = useState(90);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);
  const [protoFilePath, setProtoFilePath] = useState('');
  const [grpcMethods, setGrpcMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [selectedGrpcMethod, setSelectedGrpcMethod] = useState({
    path: method,
    type: type
  });
  const methodDropdownRef = useRef();

  console.log('>> selectedGrpcMethod', selectedGrpcMethod);
  
  const onMethodDropdownCreate = (ref) => (methodDropdownRef.current = ref);
  
  // Add a helper function to determine if the current method is a streaming method
  const isStreamingMethod = () => {
    return selectedGrpcMethod && 
           selectedGrpcMethod.type && 
           selectedGrpcMethod.type !== 'UNARY';
  };
  
  useEffect(() => {
    const el = document.querySelector('.method-selector-container');
    setMethodSelectorWidth(el.offsetWidth);
  }, [method]);

  useEffect(() => {
    const isValidGrpcUrl = (url) => {
      return url && (url.startsWith('grpc://') || url.startsWith('grpcs://') || url.startsWith('http://') || url.startsWith('https://'));
    };
    
    if (isValidGrpcUrl(url) && !protoFilePath) {
      handleReflection(url);
    }
  }, [url, protoFilePath]);

  // try to load grpc methods from reflection
  useEffect(() => {
    if (url) {
      handleReflection(url);
    }
  }, [url]);

  // Add event listeners for gRPC stream end and cancel events
  useEffect(() => {
    const { ipcRenderer } = window;
    
    // Define handlers
    const handleServerEndStream = (event, id, data) => {
      if (id === item.uid) {
        setIsConnectionAlive(false);
      }
    };
    
    const handleServerCancelStream = (event, id, data) => {
      if (id === item.uid) {
        setIsConnectionAlive(false);
      }
    };
    
    const handleGrpcError = (event, id, data) => {
      if (id === item.uid) {
        setIsConnectionAlive(false);
      }
    };
    
    // Set up listeners for the generic events
    // Do not expose events to ipcrenderer, https://www.electronjs.org/docs/latest/tutorial/security#20-do-not-expose-electron-apis-to-untrusted-web-content
    ipcRenderer.on('grpc:server-end-stream',(e, ...args)  => handleServerEndStream(e, ...args));
    ipcRenderer.on('grpc:server-cancel-stream',(e, ...args)  => handleServerCancelStream(e, ...args));
    ipcRenderer.on('grpc:error',(e, ...args)  => handleGrpcError(e, ...args));
  }, [item.uid]);

  // Periodically check if the connection is still active
  useEffect(() => {
    // Only run this for streaming methods
    if (!isStreamingMethod()) return;

    let intervalId;
    // Only start polling if we think the connection is alive
    if (isConnectionAlive) {
      // Check every 1 second if the connection is still active
      intervalId = setInterval(async () => {
        try {
          const isActive = await isGrpcConnectionActive(item.uid);
          if (!isActive && isConnectionAlive) {
            setIsConnectionAlive(false);
          }
        } catch (err) {
          console.error('Error checking gRPC connection status:', err);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [item.uid, isConnectionAlive, selectedGrpcMethod]);

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

  const onMethodSelect = ({path, type}) => {// TODO: UPDATE TO HANDLE GRPC METHODS
    console.log('>> onMethodSelect', path, type); 
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
      const { methods, error } = await loadGrpcMethodsFromReflection(url, null, null, null, { rejectUnauthorized: false });
      setGrpcMethods(methods);
      
      if (methods && methods.length > 0) {
        const haveSelectedMethod = selectedGrpcMethod && methods.some(method => method.path === selectedGrpcMethod.path);
        if (!haveSelectedMethod) {
          setSelectedGrpcMethod(null);
          onMethodSelect({path: "", type: ""});
        } else if (selectedGrpcMethod) {
          // Update the method type for the currently selected method to ensure it matches
          const currentMethod = methods.find(method => method.path === selectedGrpcMethod.path);
          if (currentMethod) {
            const methodType = getMethodType(currentMethod);
            setSelectedGrpcMethod({
              path: selectedGrpcMethod.path,
              type: methodType
            });
            onMethodSelect({path: selectedGrpcMethod.path, type: methodType});
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
        {selectedGrpcMethod && (
          <div className="mr-2">
            {getIconForMethodType(selectedGrpcMethod.type)}
          </div>
        )}
        <span className="text-xs">
          {selectedGrpcMethod ? (
            <span className="dark:text-neutral-300 text-neutral-700 text-nowrap">{selectedGrpcMethod.path.split('.').at(-1) || selectedGrpcMethod.path}</span>
          ) : (
            <span className="dark:text-neutral-300 text-neutral-700 text-nowrap">Select Method </span>
          )}
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
    onMethodSelect({path: method.path, type: methodType});
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
  }

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
  }

  const handleGenerateCode = (e) => { // TODO: UPDATE TO HANDLE GRPC GENERATE CODE grpc curl
    e.stopPropagation();
    if (item?.request?.url !== '' || (item.draft?.request?.url !== undefined && item.draft?.request?.url !== '')) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
  };

  const handleCancelConnection = (e) => {
    e.stopPropagation();
    
    // Cancel the gRPC connection using the request ID
    cancelGrpcConnection(item.uid)
      .then(() => {
        setIsConnectionAlive(false);
        toast.success('gRPC connection cancelled');
      })
      .catch(err => {
        console.error('Failed to cancel gRPC connection:', err);
        toast.error('Failed to cancel gRPC connection');
      });
  };

  const handleEndConnection = (e) => {
    e.stopPropagation();
    
    // End the gRPC stream gracefully using the request ID
    endGrpcConnection(item.uid)
      .then(() => {
        setIsConnectionAlive(false);
        toast.success('gRPC stream ended');
      })
      .catch(err => {
        console.error('Failed to end gRPC stream:', err);
        toast.error('Failed to end gRPC stream');
      });
  };

  const handleSelectProtoFile = (e) => {
    e.stopPropagation();
    
    const filters = [
      { name: 'Proto Files', extensions: ['proto'] }
    ];
      
    dispatch(browseFiles(filters, [""]))
      .then((filePaths) => {
        console.log('...result', filePaths);
        if (filePaths && filePaths.length > 0) {
          const filePath = filePaths[0];
          setProtoFilePath(filePath);
          toast.success('Proto file selected: ' + filePath);
          
          // Optionally, load the gRPC methods from the proto file
          loadGrpcMethodsFromProtoFile(filePath)
            .then(({ methods, error }) => {
              console.log('Loaded gRPC methods:', methods);
              if (methods && methods.length > 0) {
                const haveSelectedMethod = selectedGrpcMethod && methods.some(method => method.path === selectedGrpcMethod);
                if (!haveSelectedMethod) {
                  setSelectedGrpcMethod(null);
                  onMethodSelect("");
                }
              }
              // Here you could update the UI with the available methods
              setGrpcMethods(methods);
            })
            .catch((err) => {
              console.error('Error loading gRPC methods:', err);
              toast.error('Failed to load gRPC methods from proto file');
            });
        }
      })
      .catch((err) => {
        console.error('Error selecting proto file:', err);
        toast.error('Failed to select proto file');
      });
  };

  return (
    <StyledWrapper className="flex items-center">
      <div className="flex items-center h-full method-selector-container">
          <div className="flex items-center justify-center h-full w-16">
            <span className="text-xs text-indigo-500 font-bold">gRPC</span>
          </div>
      </div>
      <div
        className="flex items-center flex-grow input-container h-full"
        style={{
          color: 'yellow',
          width: `calc(100% - ${methodSelectorWidth}px)`,
          maxWidth: `calc(100% - ${methodSelectorWidth}px)`
        }}
      >

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
          <div className="flex items-center h-full ml-2 method-dropdown">
            <Dropdown 
              onCreate={onMethodDropdownCreate} 
              icon={<MethodsDropdownIcon />} 
              placement="bottom-start"
            >
              <div className="method-dropdown-menu max-h-60 overflow-y-auto">
                {grpcMethods
                  .map((method, index) => (
                  <div
                    key={index}
                    className={`dropdown-item ${selectedGrpcMethod && selectedGrpcMethod.path === method.path ? 'bg-indigo-100 dark:bg-indigo-900' : ''}`}
                    onClick={() => handleGrpcMethodSelect(method)}
                  >
                    <div className="text-xs text-gray-500 mr-3">
                      {getIconForMethodType(method.type)}
                    </div>
                    <div>{method.path.split(".").at(-1) || method.path}</div>
                  </div>
                ))}
              </div>
            </Dropdown>
          </div>
        )}
        <div className="flex items-center h-full mr-2 gap-3 cursor-pointer" id="send-request" onClick={(e) => {
          e.stopPropagation();
          
          // Always set to true initially when sending a request if it's a streaming method
          if (isStreamingMethod()) {
            setIsConnectionAlive(true);
            
            // After a short delay, verify the connection was established
            setTimeout(async () => {
              try {
                const isActive = await isGrpcConnectionActive(item.uid);
                if (!isActive) {
                  setIsConnectionAlive(false);
                }
              } catch (err) {
                console.error('Error verifying gRPC connection status:', err);
              }
            }, 500);
          }
          
          console.log('...sending request', item);
          handleRun(e);
        }}>
          <div
            className="infotip"
            onClick={(e) => {
              handleGenerateCode(e);
            }}
          >
            <IconCode
              color={theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={'cursor-pointer'}
            />
            <span className="infotiptext text-xs">
              Generate Code
            </span>
          </div>
          <div
            className="infotip"
            onClick={(e) => {
              handleSelectProtoFile(e);
            }}
          >
            <IconFile
              color={theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={'cursor-pointer'}
            />
            <span className="infotiptext text-xs">
              Select Proto File
            </span>
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
              className={'cursor-pointer'}
            />
            <span className="infotiptext text-xs">
              Refresh server reflection
            </span>
          </div>
          {isLoadingMethods && (
            <div className="infotip">
              <IconLoader2
                color={theme.requestTabs.icon.color}
                strokeWidth={1.5}
                size={22}
                className="animate-spin"
              />
              <span className="infotiptext text-xs">
                Loading gRPC Methods
              </span>
            </div>
          )}
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
          
          {isConnectionAlive && isStreamingMethod() && (
            <div className="connection-controls relative flex items-center h-full gap-3">
                <div className="infotip" onClick={handleCancelConnection}>
                  <IconX 
                    color={theme.requestTabs.icon.color}
                    strokeWidth={1.5} 
                    size={22} 
                    className="cursor-pointer"
                  />
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

          {(!isConnectionAlive || !isStreamingMethod()) && <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={22} />}
        </div>
      </div>
      {generateCodeItemModalOpen && (
        <GenerateCodeItem collection={collection} item={item} onClose={() => setGenerateCodeItemModalOpen(false)} />
      )}
    </StyledWrapper>
  );
};

export default GrpcQueryUrl;
