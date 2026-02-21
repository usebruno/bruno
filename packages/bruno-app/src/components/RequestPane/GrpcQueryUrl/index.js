import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { requestUrlChanged, updateRequestMethod, updateRequestProtoPath } from 'providers/ReduxStore/slices/collections';
import { saveRequest, generateGrpcurlCommand } from 'providers/ReduxStore/slices/collections/actions';
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
  IconChevronDown,
  IconPlugConnected,
  IconSend
} from '@tabler/icons';
import toast from 'react-hot-toast';
import {
  cancelGrpcConnection,
  endGrpcConnection,
  sendGrpcMessage,
  startGrpcRequest
} from 'utils/network/index';
import { get } from 'lodash';
import GrpcurlModal from './GrpcurlModal';
import { debounce } from 'lodash';
import { getPropertyFromDraftOrRequest, findEnvironmentInCollection } from 'utils/collections';
import useReflectionManagement from 'hooks/useReflectionManagement/index';
import useProtoFileManagement from 'hooks/useProtoFileManagement/index';
import MethodDropdown from './MethodDropdown';
import ProtoFileDropdown from './ProtoFileDropdown';

const GrpcQueryUrl = ({ item, collection, handleRun }) => {
  const { theme, storedTheme } = useTheme();
  const dispatch = useDispatch();
  const method = getPropertyFromDraftOrRequest(item, 'request.method');
  const type = getPropertyFromDraftOrRequest(item, 'request.type');
  const url = getPropertyFromDraftOrRequest(item, 'request.url', '');
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const grpcMessages = body?.grpc || [];
  const enabledMessages = grpcMessages.filter((m) => m.enabled !== false);
  const isMac = isMacOS();
  const saveShortcut = isMac ? 'Cmd + S' : 'Ctrl + S';
  const editorRef = useRef(null);
  const isConnectionActive = useSelector((state) => state.collections.activeConnections.includes(item.uid));

  const [grpcMethods, setGrpcMethods] = useState([]);
  const [selectedGrpcMethod, setSelectedGrpcMethod] = useState({
    path: method,
    type: type
  });
  const [isReflectionMode, setIsReflectionMode] = useState(false);
  const [protoFilePath, setProtoFilePath] = useState(item?.request?.protoPath || '');
  const [showGrpcurlModal, setShowGrpcurlModal] = useState(false);
  const [grpcurlCommand, setGrpcurlCommand] = useState('');
  const [showProtoDropdown, setShowProtoDropdown] = useState(false);
  const [showSendMessageDropdown, setShowSendMessageDropdown] = useState(false);

  const methodDropdownRef = useRef(null);
  const protoDropdownRef = useRef(null);
  const haveFetchedMethodsRef = useRef(false);
  const sendMessageDropdownRef = useRef(null);

  const protoFileManagement = useProtoFileManagement(collection, protoFilePath);
  const reflectionManagement = useReflectionManagement(item, collection.uid);

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

    dispatch(updateRequestMethod({
      method: path,
      methodType: type,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onMethodDropdownCreate = (ref) => (methodDropdownRef.current = ref);
  const onProtoDropdownCreate = (ref) => (protoDropdownRef.current = ref);

  // Server-streaming: connection stays open for receiving responses
  // Client-streaming and bidi-streaming: can use atomic connect-and-send OR interactive mode
  const isServerStreamingMethod = selectedGrpcMethod?.type === 'server-streaming';
  const isClientStreamingMethod = selectedGrpcMethod?.type === 'client-streaming' || selectedGrpcMethod?.type === 'bidi-streaming';

  const onSave = () => {
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

    if (finalUrl !== value) {
      setTimeout(() => {
        if (editor) {
          editor.setCursor(cursor);
        }
      }, 0);
    }

    if (!protoFilePath && value) {
      setIsReflectionMode(true);
      handleReflection(finalUrl);
    }
  };

  const handleReflection = async (url, isManualRefresh = false) => {
    const { methods, error, fromCache } = await reflectionManagement.loadMethodsFromReflection(url, isManualRefresh);

    if (error) {
      toast.error(`Failed to load gRPC methods: ${error.message || 'Unknown error'}`);
      return;
    }

    setGrpcMethods(methods);
    setProtoFilePath('');
    setIsReflectionMode(true);

    // Only update protoPath if it was previously set (to avoid creating unnecessary draft state)
    const currentProtoPath = getPropertyFromDraftOrRequest(item, 'request.protoPath', '');
    if (currentProtoPath) {
      dispatch(updateRequestProtoPath({
        protoPath: '',
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }

    if (!fromCache && methods && methods.length > 0) {
      toast.success(`Loaded ${methods.length} gRPC methods from reflection`);
    }

    if (methods && methods.length > 0) {
      const haveSelectedMethod = selectedGrpcMethod && methods.some((method) => method.path === selectedGrpcMethod.path);
      if (!haveSelectedMethod) {
        setSelectedGrpcMethod(null);
        onMethodSelect({ path: '', type: '' });
      } else if (selectedGrpcMethod) {
        const currentMethod = methods.find((method) => method.path === selectedGrpcMethod.path);
        if (currentMethod) {
          setSelectedGrpcMethod({
            path: selectedGrpcMethod.path,
            type: currentMethod.type
          });
        }
      }
    }
  };

  const handleProtoFileLoad = async (filePath, isManualRefresh = false) => {
    const { methods, error, fromCache } = await protoFileManagement.loadMethodsFromProtoFile(filePath, isManualRefresh);

    if (error) {
      console.error('Failed to load gRPC methods:', error);
      toast.error('Failed to load gRPC methods');
      setGrpcMethods([]);
      return;
    }

    setProtoFilePath(filePath);
    setGrpcMethods(methods);
    setIsReflectionMode(false);

    if (!fromCache) {
      toast.success(`Loaded ${methods.length} gRPC methods from proto file`);
    }

    if (methods && methods.length > 0) {
      const haveSelectedMethod = selectedGrpcMethod && methods.some((method) => method.path === selectedGrpcMethod.path);
      if (!haveSelectedMethod) {
        setSelectedGrpcMethod(null);
        onMethodSelect({ path: '', type: '' });
      } else if (selectedGrpcMethod) {
        const currentMethod = methods.find((method) => method.path === selectedGrpcMethod.path);
        if (currentMethod) {
          setSelectedGrpcMethod({
            path: selectedGrpcMethod.path,
            type: currentMethod.type
          });
        }
      }
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

  const handleGrpcMethodSelect = (method) => {
    const methodType = method.type;
    setSelectedGrpcMethod({
      path: method.path,
      type: methodType
    });
    onMethodSelect({ path: method.path, type: methodType });
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

  const handleConnectOnly = async (e) => {
    e.stopPropagation();

    try {
      const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
      await startGrpcRequest(item, collection, environment, collection.runtimeVariables);
      toast.success('Connected - send messages when ready');
    } catch (err) {
      console.error('Failed to connect:', err);
      toast.error(err.message || 'Failed to connect');
    }
  };

  const handleSendMessage = async (messageContent) => {
    try {
      await sendGrpcMessage(item, collection.uid, messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleSendFirstMessage = async (e) => {
    e.stopPropagation();
    setShowSendMessageDropdown(false);

    if (enabledMessages.length === 0) {
      toast.error('No enabled messages to send');
      return;
    }

    await handleSendMessage(enabledMessages[0].content);
  };

  const handleSendAllMessages = async (e) => {
    e.stopPropagation();
    setShowSendMessageDropdown(false);

    if (enabledMessages.length === 0) {
      toast.error('No enabled messages to send');
      return;
    }

    let sentCount = 0;
    for (const message of enabledMessages) {
      try {
        await sendGrpcMessage(item, collection.uid, message.content);
        sentCount++;
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error(`Failed to send message ${sentCount + 1}`);
        break;
      }
    }

    if (sentCount > 0) {
      toast.success(`Sent ${sentCount} message${sentCount > 1 ? 's' : ''}`);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sendMessageDropdownRef.current && !sendMessageDropdownRef.current.contains(event.target)) {
        setShowSendMessageDropdown(false);
      }
    };

    if (showSendMessageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSendMessageDropdown]);

  const handleReflectionModeToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsReflectionMode(!isReflectionMode);
    if (!isReflectionMode) {
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
      setGrpcMethods([]);
      setSelectedGrpcMethod(null);
      onMethodSelect({ path: '', type: '' });
    }
  };

  const debouncedOnUrlChange = debounce(onUrlChange, 1000);

  useEffect(() => {
    if (haveFetchedMethodsRef.current) {
      return;
    }
    haveFetchedMethodsRef.current = true;

    if (protoFilePath) {
      setIsReflectionMode(false);
      handleProtoFileLoad(protoFilePath);
      return;
    }
    if (!url) return;
    setIsReflectionMode(true);
    handleReflection(url);
  }, []);

  return (
    <StyledWrapper className="flex items-center relative" data-testid="grpc-query-url-container">
      <div className="flex items-center h-full method-selector-container">
        <div className="flex items-center justify-center h-full px-[10px]" data-testid="grpc-method-indicator">
          <span className="text-xs font-medium" style={{ color: theme.request.grpc }}>gRPC</span>
        </div>
      </div>
      <div className="flex items-center w-full input-container h-full relative overflow-auto">
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

      </div>

      <div className="flex items-center h-full mx-2 gap-3" id="send-request">
        <MethodDropdown
          grpcMethods={grpcMethods}
          selectedGrpcMethod={selectedGrpcMethod}
          onMethodSelect={handleGrpcMethodSelect}
          onMethodDropdownCreate={onMethodDropdownCreate}
        />
        <ProtoFileDropdown
          collection={collection}
          item={item}
          isReflectionMode={isReflectionMode}
          protoFilePath={protoFilePath}
          showProtoDropdown={showProtoDropdown}
          setShowProtoDropdown={setShowProtoDropdown}
          onProtoDropdownCreate={onProtoDropdownCreate}
          onReflectionModeToggle={handleReflectionModeToggle}
          onProtoFileLoad={handleProtoFileLoad}
        />

        <div
          className="infotip"
          onClick={(e) => {
            e.stopPropagation();
            if (isReflectionMode) {
              handleReflection(url, true);
            } else if (protoFilePath) {
              handleProtoFileLoad(protoFilePath, true);
            } else {
              toast.error('No proto file selected');
            }
          }}
        >
          <IconRefresh
            color={theme.requestTabs.icon.color}
            strokeWidth={1.5}
            size={20}
            className={`${(isReflectionMode ? reflectionManagement.isLoadingMethods : protoFileManagement.isLoadingMethods) ? 'animate-spin' : 'cursor-pointer'}`}
            data-testid="refresh-methods-icon"
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
            size={20}
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
            color={item.draft ? theme.draftColor : theme.requestTabs.icon.color}
            strokeWidth={1.5}
            size={20}
            className={`${item.draft ? 'cursor-pointer' : 'cursor-default'}`}
          />
          <span className="infotip-text text-xs">
            Save <span className="shortcut">({saveShortcut})</span>
          </span>
        </div>

        {/* Show connection controls for server-streaming when connected */}
        {isConnectionActive && isServerStreamingMethod && (
          <div className="connection-controls relative flex items-center h-full gap-3">
            <div className="infotip" onClick={handleCancelConnection} data-testid="grpc-cancel-connection-button">
              <IconX color={theme.colors.text.danger} strokeWidth={1.5} size={20} className="cursor-pointer" />
              <span className="infotip-text text-xs">Cancel</span>
            </div>
          </div>
        )}

        {/* Show connection controls for client-streaming/bidi-streaming when connected (interactive mode) */}
        {isConnectionActive && isClientStreamingMethod && (
          <div className="connection-controls relative flex items-center h-full gap-3">
            <div className="infotip" onClick={handleCancelConnection} data-testid="grpc-cancel-connection-button">
              <IconX color={theme.colors.text.danger} strokeWidth={1.5} size={20} className="cursor-pointer" />
              <span className="infotip-text text-xs">Cancel</span>
            </div>

            <div className="infotip" onClick={handleEndConnection} data-testid="grpc-end-connection-button">
              <IconCheck color={theme.colors.text.green} strokeWidth={2} size={20} className="cursor-pointer" />
              <span className="infotip-text text-xs">End Stream</span>
            </div>

            {/* Send message dropdown */}
            <div className="send-dropdown-container" ref={sendMessageDropdownRef}>
              <div
                className="send-dropdown-trigger cursor-pointer flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSendMessageDropdown(!showSendMessageDropdown);
                }}
                data-testid="grpc-send-message-dropdown-trigger"
              >
                <IconSend color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={18} />
                <IconChevronDown color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={14} />
              </div>

              {showSendMessageDropdown && (
                <div className="send-dropdown-menu">
                  <div
                    className="send-dropdown-item"
                    onClick={handleSendFirstMessage}
                    data-testid="grpc-send-first-message"
                  >
                    <IconSend size={14} strokeWidth={1.5} />
                    <span>Send Message</span>
                  </div>
                  <div
                    className={`send-dropdown-item ${enabledMessages.length === 0 ? 'disabled' : ''}`}
                    onClick={enabledMessages.length > 0 ? handleSendAllMessages : undefined}
                    data-testid="grpc-send-all-messages"
                  >
                    <IconSend size={14} strokeWidth={1.5} />
                    <span>Send All ({enabledMessages.length})</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show two buttons for client-streaming/bidi-streaming when NOT connected */}
        {!isConnectionActive && isClientStreamingMethod && (
          <div className="flex items-center gap-2">
            <div
              className="infotip"
              onClick={handleConnectOnly}
              data-testid="grpc-connect-only"
            >
              <IconPlugConnected color={theme.colors.text.green} strokeWidth={1.5} size={20} className="cursor-pointer" />
              <span className="infotip-text text-xs">Connect</span>
            </div>
            <div
              className="infotip"
              onClick={(e) => {
                e.stopPropagation();
                handleRun(e);
              }}
              data-testid="grpc-connect-and-send"
            >
              <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={20} className="cursor-pointer" />
              <span className="infotip-text text-xs">Connect & Send</span>
            </div>
          </div>
        )}

        {/* Show simple Send button for unary and server-streaming when not connected */}
        {!isConnectionActive && !isClientStreamingMethod && (
          <div
            className="cursor-pointer"
            data-testid="grpc-send-request-button"
            onClick={(e) => {
              e.stopPropagation();
              handleRun(e);
            }}
          >
            <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={20} />
          </div>
        )}
      </div>
      {/* Connection status strip when connected */}
      {isConnectionActive && (isServerStreamingMethod || isClientStreamingMethod) && (
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
