import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
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
  IconCode
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
  const { t } = useTranslation();
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
    const { methods, error, fromCache } = await reflectionManagement.loadMethodsFromReflection(url, isManualRefresh);

    if (error) {
      toast.error(t('GRPC_QUERY_URL.METHODS_LOAD_FAILED', { error: error.message || t('GRPC_QUERY_URL.UNKNOWN_ERROR') }));
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
      toast.success(t('GRPC_QUERY_URL.METHODS_LOADED_REFLECTION', { count: methods.length }));
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
      toast.error(t('GRPC_QUERY_URL.METHODS_LOAD_FAILED_GENERIC'));
      setGrpcMethods([]);
      return;
    }

    setProtoFilePath(filePath);
    setGrpcMethods(methods);
    setIsReflectionMode(false);

    if (!fromCache) {
      toast.success(t('GRPC_QUERY_URL.METHODS_LOADED_PROTO', { count: methods.length }));
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
      toast.error(t('GRPC_QUERY_URL.URL_REQUIRED'));
      return;
    }

    if (!selectedGrpcMethod?.path) {
      toast.error(t('GRPC_QUERY_URL.METHOD_REQUIRED'));
      return;
    }

    try {
      const result = await dispatch(generateGrpcurlCommand(item, collection.uid));

      if (result.success) {
        setGrpcurlCommand(result.command);
        setShowGrpcurlModal(true);
      } else {
        toast.error(result.error || t('GRPC_QUERY_URL.GRPCURL_GENERATE_FAILED'));
      }
    } catch (error) {
      console.error('Error generating grpcurl command:', error);
      toast.error(t('GRPC_QUERY_URL.GRPCURL_GENERATE_FAILED'));
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
        toast.success(t('GRPC_QUERY_URL.CONNECTION_CANCELLED'));
      })
      .catch((err) => {
        console.error('Failed to cancel gRPC connection:', err);
        toast.error(t('GRPC_QUERY_URL.CONNECTION_CANCEL_FAILED'));
      });
  };

  const handleEndConnection = (e) => {
    e.stopPropagation();

    endGrpcConnection(item.uid)
      .then(() => {
        toast.success(t('GRPC_QUERY_URL.STREAM_ENDED'));
      })
      .catch((err) => {
        console.error('Failed to end gRPC stream:', err);
        toast.error(t('GRPC_QUERY_URL.STREAM_END_FAILED'));
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
              toast.error(t('GRPC_QUERY_URL.NO_PROTO_FILE'));
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
            {isReflectionMode ? t('GRPC_QUERY_URL.REFRESH_REFLECTION') : t('GRPC_QUERY_URL.REFRESH_PROTO')}
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
          <span className="infotip-text text-xs">{t('GRPC_QUERY_URL.GENERATE_GRPCURL')}</span>
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
            {t('QUERY_URL.SAVE')} <span className="shortcut">({saveShortcut})</span>
          </span>
        </div>

        {isConnectionActive && isStreamingMethod && (
          <div className="connection-controls relative flex items-center h-full gap-3">
            <div className="infotip" onClick={handleCancelConnection} data-testid="grpc-cancel-connection-button">
              <IconX color={theme.requestTabs.icon.color} strokeWidth={1.5} size={20} className="cursor-pointer" />
              <span className="infotip-text text-xs">{t('GRPC_QUERY_URL.CANCEL')}</span>
            </div>

            {isClientStreamingMethod && (
              <div onClick={handleEndConnection} data-testid="grpc-end-connection-button">
                <IconCheck
                  color={theme.colors.text.green}
                  strokeWidth={2}
                  size={20}
                  className="cursor-pointer"
                />
              </div>
            )}
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
            <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={20} />
          </div>
        )}
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
