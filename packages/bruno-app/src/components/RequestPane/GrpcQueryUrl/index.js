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
} from '@tabler/icons';
import toast from 'react-hot-toast';
import {
  cancelGrpcConnection,
  endGrpcConnection
} from 'utils/network/index';
import GrpcurlModal from './GrpcurlModal';
import { debounce } from 'lodash';
import { getPropertyFromDraftOrRequest } from 'utils/collections';
import useReflectionManagement from 'hooks/useReflectionManagement/index';
import useProtoFileManagement from 'hooks/useProtoFileManagement/index';
import MethodDropdown from './MethodDropdown';
import ProtoFileDropdown from './ProtoFileDropdown';

const STREAMING_METHOD_TYPES = ['client-streaming', 'server-streaming', 'bidi-streaming'];
const CLIENT_STREAMING_METHOD_TYPES = ['client-streaming', 'bidi-streaming'];

const GrpcQueryUrl = ({ item, collection, handleRun }) => {
  const { theme, storedTheme } = useTheme();
  const dispatch = useDispatch();
  const method = getPropertyFromDraftOrRequest(item, 'request.method');
  const type = getPropertyFromDraftOrRequest(item, 'request.type');
  const url = getPropertyFromDraftOrRequest(item, 'request.url', '');
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

  const methodDropdownRef = useRef(null);
  const protoDropdownRef = useRef(null);
  const haveFetchedMethodsRef = useRef(false);

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

  const isStreamingMethod = selectedGrpcMethod && selectedGrpcMethod.type && STREAMING_METHOD_TYPES.includes(selectedGrpcMethod.type);
  const isClientStreamingMethod = selectedGrpcMethod && selectedGrpcMethod.type && CLIENT_STREAMING_METHOD_TYPES.includes(selectedGrpcMethod.type);

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
    const { methods, error } = await reflectionManagement.loadMethodsFromReflection(url, isManualRefresh);

    if (error) {
      toast.error(`Failed to load gRPC methods: ${error.message || 'Unknown error'}`);
      return;
    }

    setGrpcMethods(methods);
    setProtoFilePath('');
    setIsReflectionMode(true);

    dispatch(updateRequestProtoPath({
      protoPath: '',
      itemUid: item.uid,
      collectionUid: collection.uid
    }));

    if (methods && methods.length > 0) {
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
    const { methods, error } = await protoFileManagement.loadMethodsFromProtoFile(filePath, isManualRefresh);

    if (error) {
      console.error('Failed to load gRPC methods:', error);
      toast.error('Failed to load gRPC methods');
      setGrpcMethods([]);
      return;
    }

    setProtoFilePath(filePath);
    setGrpcMethods(methods);
    setIsReflectionMode(false);

    toast.success(`Loaded ${methods.length} gRPC methods from proto file`);

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
        <div className="flex items-center justify-center h-full w-16" data-testid="grpc-method-indicator">
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

        <MethodDropdown
          grpcMethods={grpcMethods}
          selectedGrpcMethod={selectedGrpcMethod}
          onMethodSelect={handleGrpcMethodSelect}
          onMethodDropdownCreate={onMethodDropdownCreate}
        />
        <div className="flex items-center h-full mr-2 gap-3" id="send-request">
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
              size={22}
              className={`${(isReflectionMode ? reflectionManagement.isLoadingMethods : protoFileManagement.isLoadingMethods) ? 'animate-spin' : 'cursor-pointer'}`}
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
              data-testid="grpc-send-request-button"
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
