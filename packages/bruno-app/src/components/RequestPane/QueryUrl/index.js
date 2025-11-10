import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { 
  requestUrlChanged, 
  updateRequestMethod,
  setRequestHeaders,
  updateRequestBodyMode,
  updateRequestBody,
  updateRequestGraphqlQuery,
  updateRequestGraphqlVariables,
  updateRequestAuthMode,
  updateAuth
} from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { getRequestFromCurlCommand } from 'utils/curl';
import HttpMethodSelector from './HttpMethodSelector';
import { useTheme } from 'providers/Theme';
import { IconDeviceFloppy, IconArrowRight, IconCode } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import GenerateCodeItem from 'components/Sidebar/Collections/Collection/CollectionItem/GenerateCodeItem/index';
import toast from 'react-hot-toast';

const QueryUrl = ({ item, collection, handleRun }) => {
  const { theme, storedTheme } = useTheme();
  const dispatch = useDispatch();
  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const isMac = isMacOS();
  const saveShortcut = isMac ? 'Cmd + S' : 'Ctrl + S';
  const editorRef = useRef(null);
  const isGrpc = item.type === 'grpc-request';

  const [methodSelectorWidth, setMethodSelectorWidth] = useState(90);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);
  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  useEffect(() => {
    const el = document.querySelector('.method-selector-container');
    setMethodSelectorWidth(el.offsetWidth);
  }, [method]);

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

  const onMethodSelect = (verb) => {
    dispatch(
      updateRequestMethod({
        method: verb,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleGenerateCode = (e) => {
    e.stopPropagation();
    if (item?.request?.url !== '' || (item.draft?.request?.url !== undefined && item.draft?.request?.url !== '')) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
  };

  const handlePaste = useCallback(
    (event) => {
      // Only enable curl paste detection for HTTP requests
      if (item.type !== 'http-request') {
        return;
      }

      const clipboardData = event.clipboardData || window.clipboardData;
      const pastedData = clipboardData.getData('Text');

      // Check if pasted data looks like a cURL command
      const curlCommandRegex = /^\s*curl\s/i;
      if (!curlCommandRegex.test(pastedData)) {
        // Not a curl command, allow normal paste behavior
        return;
      }

      // Prevent the default paste behavior
      event.preventDefault();

      try {
        // Parse the curl command
        const request = getRequestFromCurlCommand(pastedData);
        if (!request || !request.url) {
          toast.error('Invalid cURL command');
          return;
        }

        // Update URL
        dispatch(
          requestUrlChanged({
            itemUid: item.uid,
            collectionUid: collection.uid,
            url: request.url
          })
        );

        // Update method
        if (request.method) {
          dispatch(
            updateRequestMethod({
              method: request.method.toUpperCase(), // Convert to uppercase
              itemUid: item.uid,
              collectionUid: collection.uid
            })
          );
        }

        // Update headers
        if (request.headers && request.headers.length > 0) {
          dispatch(
            setRequestHeaders({
              collectionUid: collection.uid,
              itemUid: item.uid,
              headers: request.headers
            })
          );
        }

        // Update body
        if (request.body) {
          const bodyMode = request.body.mode;
          
          // Set body mode first
          dispatch(
            updateRequestBodyMode({
              itemUid: item.uid,
              collectionUid: collection.uid,
              mode: bodyMode
            })
          );

          // Set body content based on mode
          if (bodyMode === 'json' && request.body.json) {
            dispatch(
              updateRequestBody({
                itemUid: item.uid,
                collectionUid: collection.uid,
                content: request.body.json
              })
            );
          } else if (bodyMode === 'text' && request.body.text) {
            dispatch(
              updateRequestBody({
                itemUid: item.uid,
                collectionUid: collection.uid,
                content: request.body.text
              })
            );
          } else if (bodyMode === 'xml' && request.body.xml) {
            dispatch(
              updateRequestBody({
                itemUid: item.uid,
                collectionUid: collection.uid,
                content: request.body.xml
              })
            );
          } else if (bodyMode === 'graphql' && request.body.graphql) {
            if (request.body.graphql.query) {
              dispatch(
                updateRequestGraphqlQuery({
                  itemUid: item.uid,
                  collectionUid: collection.uid,
                  query: request.body.graphql.query
                })
              );
            }
            if (request.body.graphql.variables) {
              dispatch(
                updateRequestGraphqlVariables({
                  itemUid: item.uid,
                  collectionUid: collection.uid,
                  variables: request.body.graphql.variables
                })
              );
            }
          } else if (bodyMode === 'formUrlEncoded' && request.body.formUrlEncoded) {
            // For formUrlEncoded, we need to set each param individually
            // This is a limitation - we'd need to clear existing params first
            // For now, we'll set the body mode and the user can manually adjust
            // TODO: Implement proper formUrlEncoded param setting
          } else if (bodyMode === 'multipartForm' && request.body.multipartForm) {
            // For multipartForm, similar limitation
            // TODO: Implement proper multipartForm param setting
          }
        }

        // Update auth
        if (request.auth) {
          const authMode = request.auth.mode;
          if (authMode) {
            dispatch(
              updateRequestAuthMode({
                itemUid: item.uid,
                collectionUid: collection.uid,
                mode: authMode
              })
            );

            // Set auth content based on mode
            if (request.auth.basic) {
              dispatch(
                updateAuth({
                  mode: 'basic',
                  collectionUid: collection.uid,
                  itemUid: item.uid,
                  content: request.auth.basic
                })
              );
            } else if (request.auth.bearer) {
              dispatch(
                updateAuth({
                  mode: 'bearer',
                  collectionUid: collection.uid,
                  itemUid: item.uid,
                  content: request.auth.bearer
                })
              );
            } else if (request.auth.digest) {
              dispatch(
                updateAuth({
                  mode: 'digest',
                  collectionUid: collection.uid,
                  itemUid: item.uid,
                  content: request.auth.digest
                })
              );
            } else if (request.auth.ntlm) {
              dispatch(
                updateAuth({
                  mode: 'ntlm',
                  collectionUid: collection.uid,
                  itemUid: item.uid,
                  content: request.auth.ntlm
                })
              );
            } else if (request.auth.awsv4) {
              dispatch(
                updateAuth({
                  mode: 'awsv4',
                  collectionUid: collection.uid,
                  itemUid: item.uid,
                  content: request.auth.awsv4
                })
              );
            } else if (request.auth.apikey) {
              dispatch(
                updateAuth({
                  mode: 'apikey',
                  collectionUid: collection.uid,
                  itemUid: item.uid,
                  content: request.auth.apikey
                })
              );
            }
          }
        }

        toast.success('cURL command imported successfully');
      } catch (error) {
        console.error('Error parsing cURL command:', error);
        toast.error('Failed to parse cURL command');
      }
    },
    [dispatch, item.uid, item.type, collection.uid]
  );

  return (
    <StyledWrapper className="flex items-center">
      <div className="flex flex-1 items-center h-full method-selector-container">
        {isGrpc ? (
          <div className="flex items-center justify-center h-full w-16">
            <span className="text-xs text-indigo-500 font-bold">gRPC</span>
          </div>
          
        ) : (
          <HttpMethodSelector method={method} onMethodSelect={onMethodSelect} />
        )}
      </div>
      <div
        id="request-url"
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
          onPaste={handlePaste}
          collection={collection}
          highlightPathParams={true}
          item={item}
        />
        <div className="flex items-center h-full mr-2 cursor-pointer" id="send-request" onClick={handleRun}>
          <div
            title="Generate Code"
            className="infotip mr-3"
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
            title="Save Request"
            className="infotip mr-3"
            onClick={(e) => {
              e.stopPropagation();
              if (!hasChanges) return;
              onSave();
            }}
          >
            <IconDeviceFloppy
              color={hasChanges ? theme.colors.text.yellow : theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={`${hasChanges ? 'cursor-pointer' : 'cursor-default'}`}
            />
            <span className="infotiptext text-xs">
              Save <span className="shortcut">({saveShortcut})</span>
            </span>
          </div>
          <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={22} data-testid="send-arrow-icon" />
        </div>
      </div>
      {generateCodeItemModalOpen && (
        <GenerateCodeItem collectionUid={collection.uid} item={item} onClose={() => setGenerateCodeItemModalOpen(false)} />
      )}
    </StyledWrapper>
  );
};

export default QueryUrl;
