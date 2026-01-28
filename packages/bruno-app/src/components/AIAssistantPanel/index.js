import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconX, IconCode, IconSend, IconTrash, IconPlayerStop, IconFiles, IconPaperclip } from '@tabler/icons';
import { updateRequestScript, updateResponseScript, updateRequestTests } from 'providers/ReduxStore/slices/collections';
import { updateAIPanelWidth, setAIMode, addFileToAISelection, removeFileFromAISelection, clearAIFileSelection } from 'providers/ReduxStore/slices/app';
import ModeSelector from './ModeSelector';
import FileSelector from './FileSelector';
import MultiFileDiffView from './MultiFileDiffView';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import Button from 'ui/Button';
import DiffView from './DiffView/index';
import ChatMessage from './ChatMessage';
import StyledWrapper from './StyledWrapper';

// Constants for panel dimensions
const AI_PANEL_MAX_WIDTH = 700;
const AI_PANEL_MIN_WIDTH = 300;

/**
 * Helper function to get Redux action and payload for script updates
 * Centralizes the repeated logic for updating different script types
 */
const getScriptUpdateConfig = (scriptType, code, itemUid, collectionUid) => {
  switch (scriptType) {
    case 'pre-request':
      return {
        action: updateRequestScript,
        payload: { script: code, itemUid, collectionUid }
      };
    case 'tests':
      return {
        action: updateRequestTests,
        payload: { tests: code, itemUid, collectionUid }
      };
    default: // post-response
      return {
        action: updateResponseScript,
        payload: { script: code, itemUid, collectionUid }
      };
  }
};

const PRE_REQUEST_KEYWORDS = ['pre-request', 'pre request', 'pre script', 'pre-script', 'before request', 'prerequest', 'prescript'];
const POST_RESPONSE_KEYWORDS = ['post-response', 'post response', 'post script', 'post-script', 'after response', 'postresponse', 'postscript'];
const TESTS_KEYWORDS = ['test script', 'tests script', 'tests tab', 'test tab', 'in tests', 'to tests', 'in the tests', 'to the tests'];

/**
 * Detect user intent from their message
 * Returns 'tests' if user explicitly wants tests script, 'pre-request' for pre-request, 'post-response' for post-response
 */
const detectUserIntent = (message) => {
  const lower = message.toLowerCase();
  // Check for tests script first (more specific)
  if (TESTS_KEYWORDS.some((kw) => lower.includes(kw))) return 'tests';
  if (PRE_REQUEST_KEYWORDS.some((kw) => lower.includes(kw))) return 'pre-request';
  if (POST_RESPONSE_KEYWORDS.some((kw) => lower.includes(kw))) return 'post-response';
  return null;
};

/**
 * Strip markdown code fences from AI-generated code
 */
const stripMarkdownCodeFences = (code) => {
  if (!code) return '';
  let result = code.trim();
  const openingMatch = result.match(/^`{3,}(\w*)\s*\n?/);
  if (openingMatch) result = result.slice(openingMatch[0].length);
  const closingMatch = result.match(/\n?`{3,}\s*$/);
  if (closingMatch) result = result.slice(0, -closingMatch[0].length);
  return result.trim();
};

const POST_RESPONSE_PATTERNS = [/\btest\s*\(/, /\bexpect\s*\(/, /\bres\./, /\bres\s*\(/];
const PRE_REQUEST_PATTERNS = [/\breq\.set/, /\breq\.setTimeout/, /\breq\.setMaxRedirects/];

/**
 * Detect script type from code content
 */
const detectScriptTypeFromCode = (code) => {
  if (POST_RESPONSE_PATTERNS.some((p) => p.test(code))) return 'post-response';
  if (PRE_REQUEST_PATTERNS.some((p) => p.test(code))) return 'pre-request';
  return 'post-response';
};

/**
 * Parse multi-file response from AI
 * Expected format:
 * ===FILE:uid===
 * SCRIPT_TYPE:pre-request|post-response|tests
 * CODE:
 * // code here
 * ===END_FILE===
 */
const parseMultiFileResponse = (response) => {
  const filePattern = /===FILE:([^=]+)===\s*\nSCRIPT_TYPE:(pre-request|post-response|tests)\s*\nCODE:\s*\n([\s\S]*?)===END_FILE===/g;
  const results = [];
  let match;

  while ((match = filePattern.exec(response)) !== null) {
    results.push({
      itemUid: match[1].trim(),
      scriptType: match[2].trim(),
      code: stripMarkdownCodeFences(match[3].trim())
    });
  }

  return results;
};

const AIAssistantPanel = ({ isOpen, onClose, context }) => {
  const dispatch = useDispatch();

  // Get current active tab and collections from Redux to ensure we have fresh context
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const tabs = useSelector((state) => state.tabs.tabs);
  const collections = useSelector((state) => state.collections.collections);
  const panelWidth = useSelector((state) => state.app.aiPanelWidth);
  const aiMode = useSelector((state) => state.app.aiMode);
  const selectedFilesForAI = useSelector((state) => state.app.selectedFilesForAI);

  // Derive the current item and collection from active tab (fresh context)
  const { item, collection, scriptType, currentScript, testsScript } = useMemo(() => {
    const activeTab = tabs.find((t) => t.uid === activeTabUid);
    if (!activeTab) {
      return { item: null, collection: null, scriptType: 'post-response', currentScript: '', testsScript: '' };
    }

    const foundCollection = findCollectionByUid(collections, activeTab.collectionUid);
    if (!foundCollection) {
      return { item: null, collection: null, scriptType: 'post-response', currentScript: '', testsScript: '' };
    }

    const foundItem = findItemInCollection(foundCollection, activeTab.uid);
    if (!foundItem || !foundItem.request) {
      return { item: null, collection: null, scriptType: 'post-response', currentScript: '', testsScript: '' };
    }

    // Use context scriptType if available, otherwise default to post-response
    const type = context?.scriptType || 'post-response';
    let script;
    if (type === 'pre-request') {
      script = foundItem.draft?.request?.script?.req || foundItem.request?.script?.req || '';
    } else if (type === 'tests') {
      script = foundItem.draft?.request?.tests || foundItem.request?.tests || '';
    } else {
      script = foundItem.draft?.request?.script?.res || foundItem.request?.script?.res || '';
    }

    // Get tests script separately for context
    const tests = foundItem.draft?.request?.tests || foundItem.request?.tests || '';

    return {
      item: foundItem,
      collection: foundCollection,
      scriptType: type,
      currentScript: script,
      testsScript: tests
    };
  }, [activeTabUid, tabs, collections, context?.scriptType]);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [streamedContent, setStreamedContent] = useState('');
  const [status, setStatus] = useState('idle'); // idle | generating | reviewing | reviewing-multi
  const [pendingChange, setPendingChange] = useState(null);
  const [pendingMultiChanges, setPendingMultiChanges] = useState([]); // For multi-file mode
  const [currentStreamId, setCurrentStreamId] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const contentRef = useRef(null);
  const inputRef = useRef(null);
  const streamedContentRef = useRef('');
  const resizeRef = useRef(null);
  const lastUserMessageRef = useRef('');
  const hasInitialFocusRef = useRef(false);

  // Check if we have a valid request selected
  const hasRequestSelected = item && item.request && collection;

  // Auto-select current request when switching tabs
  useEffect(() => {
    if (item && collection) {
      // Check if current item is already selected
      const isAlreadySelected = selectedFilesForAI.some((f) => f.itemUid === item.uid);

      if (!isAlreadySelected) {
        // Clear previous selection and add current item
        dispatch(clearAIFileSelection());
        dispatch(addFileToAISelection({
          itemUid: item.uid,
          collectionUid: collection.uid,
          name: item.name,
          method: item.request?.method || 'GET',
          url: item.request?.url || ''
        }));
      }
    }
  }, [item, collection, dispatch]);

  // Clear state when active tab changes to avoid stale data
  useEffect(() => {
    setMessages([]);
    setInputValue('');
    setStreamedContent('');
    setStatus('idle');
    setPendingChange(null);
    setPendingMultiChanges([]);
    setCurrentStreamId(null);
    setShowFileSelector(false);
    streamedContentRef.current = '';
  }, [activeTabUid]);

  // Scroll to bottom when content changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamedContent, messages]);

  // Focus input only on initial panel open (not on subsequent state changes)
  useEffect(() => {
    if (isOpen && inputRef.current && hasRequestSelected && !hasInitialFocusRef.current) {
      inputRef.current.focus();
      hasInitialFocusRef.current = true;
    }
    if (!isOpen) {
      hasInitialFocusRef.current = false;
    }
  }, [isOpen, hasRequestSelected]);

  // Handle panel resize
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: panelWidth
    };
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (resizeRef.current) {
        const delta = resizeRef.current.startX - e.clientX;
        const newWidth = Math.min(AI_PANEL_MAX_WIDTH, Math.max(AI_PANEL_MIN_WIDTH, resizeRef.current.startWidth + delta));
        dispatch(updateAIPanelWidth(newWidth));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, dispatch]);

  // Set up IPC event listeners for streaming
  useEffect(() => {
    if (!isOpen) return;

    const handleChunk = ({ streamId, chunk }) => {
      if (streamId === currentStreamId) {
        streamedContentRef.current += chunk;
        setStreamedContent(streamedContentRef.current);
      }
    };

    const handleEnd = ({ streamId, responseType, content }) => {
      if (streamId === currentStreamId) {
        // Use content from IPC if available, otherwise fall back to accumulated stream
        const responseContent = content || streamedContentRef.current;

        if (responseContent.trim()) {
          if (responseType === 'text') {
            // Text response - show as chat message, no diff view
            setMessages((prev) => [
              ...prev,
              { type: 'assistant', content: responseContent.trim(), isCode: false }
            ]);
            setStatus('idle');
          } else if (responseType === 'multi-file') {
            // Multi-file response - parse and handle multiple changes
            const parsed = parseMultiFileResponse(responseContent);
            if (parsed.length > 0) {
              // Build pending changes with original scripts
              const changes = parsed.map((p) => {
                const file = selectedFilesForAI.find((f) => f.itemUid === p.itemUid);
                const fileCollection = file ? findCollectionByUid(collections, file.collectionUid) : null;
                const fileItem = fileCollection ? findItemInCollection(fileCollection, p.itemUid) : null;
                let originalScript;
                if (p.scriptType === 'pre-request') {
                  originalScript = fileItem?.draft?.request?.script?.req || fileItem?.request?.script?.req || '';
                } else if (p.scriptType === 'tests') {
                  originalScript = fileItem?.draft?.request?.tests || fileItem?.request?.tests || '';
                } else {
                  originalScript = fileItem?.draft?.request?.script?.res || fileItem?.request?.script?.res || '';
                }

                return {
                  itemUid: p.itemUid,
                  collectionUid: file?.collectionUid,
                  fileName: file?.name || fileItem?.name || 'Unknown',
                  method: file?.method || fileItem?.request?.method || 'GET',
                  scriptType: p.scriptType,
                  original: originalScript,
                  proposed: p.code,
                  status: 'pending'
                };
              });

              if (aiMode === 'auto-accept') {
                // Apply all changes immediately
                changes.forEach((change) => {
                  const { action: updateAction, payload: updatePayload } = getScriptUpdateConfig(
                    change.scriptType,
                    change.proposed,
                    change.itemUid,
                    change.collectionUid
                  );
                  dispatch(updateAction(updatePayload));
                });
                setMessages((prev) => [
                  ...prev,
                  { type: 'success', content: `Applied changes to ${changes.length} file(s).` }
                ]);
                setStatus('idle');
              } else if (aiMode === 'ask') {
                setMessages((prev) => [
                  ...prev,
                  { type: 'warning', content: 'Ask Mode is active. Code was generated but will not be applied. Switch to "Ask Before Edit" or "Auto Accept" mode to apply code changes.' },
                  { type: 'info', content: `Generated code for ${changes.length} file(s).` }
                ]);
                setStatus('idle');
              } else {
                // Ask-before-edit: Show multi-file diff view
                setPendingMultiChanges(changes);
                setStatus('reviewing-multi');
              }
            } else {
              setMessages((prev) => [
                ...prev,
                { type: 'error', content: 'Could not parse multi-file response. Please try again.' }
              ]);
              setStatus('idle');
            }
          } else {
            // Single file code response - handle based on AI mode
            // Strip markdown code fences if present (AI sometimes wraps code in ```)
            const proposedCode = stripMarkdownCodeFences(responseContent);

            // First check user intent from their message, then fall back to code analysis
            const userIntent = detectUserIntent(lastUserMessageRef.current);
            // For tests, use user intent if explicitly requested, otherwise default to post-response for test code
            const detectedType = userIntent || detectScriptTypeFromCode(proposedCode);

            // Get the correct original script based on detected type
            let originalScript;
            if (detectedType === 'pre-request') {
              originalScript = item?.draft?.request?.script?.req || item?.request?.script?.req || '';
            } else if (detectedType === 'tests') {
              originalScript = item?.draft?.request?.tests || item?.request?.tests || '';
            } else {
              // post-response (default)
              originalScript = item?.draft?.request?.script?.res || item?.request?.script?.res || '';
            }

            if (aiMode === 'ask') {
              // ASK MODE: Code was generated but shouldn't be applied
              // Show warning that code generation is disabled in Ask Mode
              setMessages((prev) => [
                ...prev,
                { type: 'warning', content: 'Ask Mode is active. Code was generated but will not be applied. Switch to "Ask Before Edit" or "Auto Accept" mode to apply code changes.' },
                { type: 'assistant', content: proposedCode, isCode: true, readOnly: true }
              ]);
              setStatus('idle');
            } else if (aiMode === 'auto-accept') {
              // AUTO-ACCEPT MODE: Apply changes immediately
              const { action: updateAction, payload: updatePayload } = getScriptUpdateConfig(
                detectedType,
                proposedCode,
                item.uid,
                collection.uid
              );
              dispatch(updateAction(updatePayload));

              const scriptLabel = detectedType === 'tests' ? 'tests' : detectedType;
              setMessages((prev) => [
                ...prev,
                { type: 'assistant', content: proposedCode, isCode: true },
                { type: 'success', content: `Code automatically applied to ${scriptLabel} script.` }
              ]);
              setStatus('idle');
            } else {
              // ASK-BEFORE-EDIT MODE (default): Show diff for review
              setPendingChange({
                original: originalScript,
                proposed: proposedCode,
                detectedScriptType: detectedType
              });
              setStatus('reviewing');
            }
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { type: 'error', content: 'No response was generated. Please try again.' }
          ]);
          setStatus('idle');
        }
        streamedContentRef.current = '';
        setStreamedContent('');
        setCurrentStreamId(null);
      }
    };

    const handleError = ({ streamId, error }) => {
      if (streamId === currentStreamId) {
        setMessages((prev) => [...prev, { type: 'error', content: error }]);
        setStatus('idle');
        streamedContentRef.current = '';
        setStreamedContent('');
        setCurrentStreamId(null);
      }
    };

    const cleanupChunk = window.ipcRenderer.on('ai:stream-chunk', handleChunk);
    const cleanupEnd = window.ipcRenderer.on('ai:stream-end', handleEnd);
    const cleanupError = window.ipcRenderer.on('ai:stream-error', handleError);

    return () => {
      cleanupChunk();
      cleanupEnd();
      cleanupError();
    };
  }, [isOpen, currentStreamId, currentScript, item, aiMode, dispatch, collection, selectedFilesForAI, collections]);

  const sendMessage = useCallback(
    async (message) => {
      // Require at least one file selected
      if (!message.trim() || selectedFilesForAI.length === 0) return;

      setStatus('generating');
      streamedContentRef.current = '';
      setStreamedContent('');
      lastUserMessageRef.current = message; // Store for script type detection
      setMessages((prev) => [...prev, { type: 'user', content: message }]);
      setInputValue('');
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      try {
        let invokeParams;

        if (selectedFilesForAI.length > 1) {
          // Multi-file: build context for all selected files
          const filesContext = selectedFilesForAI.map((file) => {
            const fileCollection = findCollectionByUid(collections, file.collectionUid);
            const fileItem = fileCollection ? findItemInCollection(fileCollection, file.itemUid) : null;
            // Use the actual URL from the response if available (interpolated), otherwise fall back to the template URL
            const actualUrl = fileItem?.response?.url || file.url || fileItem?.request?.url;
            return {
              uid: file.itemUid,
              name: file.name || fileItem?.name,
              method: file.method || fileItem?.request?.method,
              url: actualUrl,
              preScript: fileItem?.draft?.request?.script?.req || fileItem?.request?.script?.req || '',
              postScript: fileItem?.draft?.request?.script?.res || fileItem?.request?.script?.res || '',
              testsScript: fileItem?.draft?.request?.tests || fileItem?.request?.tests || '',
              request: fileItem?.request,
              response: fileItem?.response
            };
          });

          invokeParams = {
            action: 'multi-file-chat',
            context: {
              userMessage: message,
              files: filesContext,
              mode: aiMode
            }
          };
        } else {
          // Single file
          invokeParams = {
            action: 'chat',
            context: {
              userMessage: message,
              script: currentScript || '',
              scriptType,
              testsScript: testsScript || '',
              mode: aiMode,
              request: {
                method: item?.request?.method,
                // Use the actual URL from the response if available (interpolated), otherwise fall back to the template URL
                url: item?.response?.url || item?.request?.url,
                headers: item?.request?.headers,
                body: item?.request?.body?.json || item?.request?.body?.text || item?.request?.body
              },
              response: item?.response
                ? {
                    status: item.response.status,
                    statusText: item.response.statusText,
                    headers: item.response.headers,
                    data: item.response.data,
                    responseTime: item.response.responseTime,
                    url: item.response.url
                  }
                : null
            }
          };
        }

        const { streamId } = await window.ipcRenderer.invoke('ai:generate', invokeParams);
        setCurrentStreamId(streamId);
      } catch (error) {
        setMessages((prev) => [...prev, { type: 'error', content: error.message }]);
        setStatus('idle');
      }
    },
    [item, currentScript, scriptType, testsScript, aiMode, selectedFilesForAI, collections]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const handleAccept = useCallback(() => {
    if (!pendingChange?.proposed || !item || !collection) {
      setPendingChange(null);
      setStatus('idle');
      return;
    }

    const targetScriptType = pendingChange.detectedScriptType || 'post-response';
    const { action: updateAction, payload: updatePayload } = getScriptUpdateConfig(
      targetScriptType,
      pendingChange.proposed,
      item.uid,
      collection.uid
    );

    const scriptLabel = targetScriptType === 'tests' ? 'tests' : targetScriptType;
    setMessages((prev) => [
      ...prev,
      { type: 'assistant', content: pendingChange.proposed, isCode: true },
      { type: 'success', content: `Code accepted! Added to ${scriptLabel} script.` }
    ]);

    dispatch(updateAction(updatePayload));

    setPendingChange(null);
    setStatus('idle');
  }, [pendingChange, item, collection, dispatch]);

  const resetStreamState = useCallback(() => {
    streamedContentRef.current = '';
    setStreamedContent('');
  }, []);

  const handleReject = useCallback(() => {
    setMessages((prev) => [...prev, { type: 'info', content: 'Changes rejected.' }]);
    setPendingChange(null);
    setStatus('idle');
  }, []);

  // Multi-file handlers
  const handleMultiFileAccept = useCallback((index) => {
    setPendingMultiChanges((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'accepted' };
      return updated;
    });
  }, []);

  const handleMultiFileReject = useCallback((index) => {
    setPendingMultiChanges((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'rejected' };
      return updated;
    });
  }, []);

  const handleMultiFileAcceptAll = useCallback(() => {
    setPendingMultiChanges((prev) =>
      prev.map((change) => ({ ...change, status: 'accepted' }))
    );
  }, []);

  const handleMultiFileRejectAll = useCallback(() => {
    setPendingMultiChanges((prev) =>
      prev.map((change) => ({ ...change, status: 'rejected' }))
    );
  }, []);

  const handleMultiFileComplete = useCallback(() => {
    // Apply all accepted changes
    const acceptedChanges = pendingMultiChanges.filter((c) => c.status === 'accepted');

    acceptedChanges.forEach((change) => {
      const { action: updateAction, payload: updatePayload } = getScriptUpdateConfig(
        change.scriptType,
        change.proposed,
        change.itemUid,
        change.collectionUid
      );
      dispatch(updateAction(updatePayload));
    });

    if (acceptedChanges.length > 0) {
      setMessages((prev) => [
        ...prev,
        { type: 'success', content: `Applied changes to ${acceptedChanges.length} file(s).` }
      ]);
    }

    setPendingMultiChanges([]);
    setStatus('idle');
  }, [pendingMultiChanges, dispatch]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setPendingChange(null);
    setPendingMultiChanges([]);
    setStatus('idle');
    resetStreamState();
  }, [resetStreamState]);

  const handleStopGeneration = useCallback(() => {
    setCurrentStreamId(null);
    setStatus('idle');
    setMessages((prev) => [...prev, { type: 'info', content: 'Generation stopped.' }]);
    resetStreamState();
  }, [resetStreamState]);

  if (!isOpen) return null;

  const hasResponse = item?.response?.status;

  // Dynamic suggestions based on context
  const suggestions = [];
  if (hasResponse) {
    suggestions.push('Generate tests for this response');
  }
  if (currentScript?.trim()) {
    suggestions.push('Improve this script');
    suggestions.push('Add error handling');
  }
  suggestions.push('Write a basic test');

  return (
    <StyledWrapper $width={panelWidth}>
      <div
        className={`resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="ai-panel-header">
        <div className="header-left">
          <span className="header-title">AI Assistant</span>
        </div>
        <div className="header-actions">
          {messages.length > 0 && status === 'idle' && (
            <button onClick={handleClearChat} className="header-btn" title="Clear chat">
              <IconTrash size={12} />
            </button>
          )}
          <button onClick={onClose} className="header-btn" title="Close (Cmd+L)">
            <IconX size={12} />
          </button>
        </div>
      </div>

      <div className="ai-panel-content" ref={contentRef}>
        {/* Empty state - no files selected */}
        {selectedFilesForAI.length === 0 && status === 'idle' && messages.length === 0 && (
          <div className="empty-state">
            <IconFiles size={24} className="empty-icon" />
            <div className="empty-title">No files selected</div>
            <div className="empty-text">
              Attach files to start using AI assistant
            </div>
          </div>
        )}

        {/* Welcome state with suggestions */}
        {selectedFilesForAI.length > 0 && status === 'idle' && messages.length === 0 && !pendingChange && (
          <div className="welcome-state">
            <p className="welcome-text">
              Generate tests, improve scripts, or ask anything about your API.
            </p>
            <div className="suggestions">
              {suggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  color="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-chip"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages history */}
        {messages.map((msg, idx) => (
          <ChatMessage
            key={idx}
            type={msg.type}
            content={msg.content}
            isCode={msg.isCode}
          />
        ))}

        {/* Loading/Streaming state */}
        {status === 'generating' && (
          <div className="generating-state">
            {streamedContent ? (
              <div className="streamed-content">
                {streamedContent
                  .replace(/^TEXT:\s*/i, '')
                  .replace(/^CODE:\s*/i, '')}
              </div>
            ) : (
              <span className="generating-title">Generating...</span>
            )}
          </div>
        )}

        {/* Review state - show diff with accept/reject (single file) */}
        {status === 'reviewing' && pendingChange && (
          <div className="review-state">
            <div className="review-header">
              <IconCode size={12} />
              <span>Review Changes</span>
            </div>
            <DiffView original={pendingChange.original} proposed={pendingChange.proposed} />
            <div className="review-actions">
              <Button
                variant="outline"
                color="danger"
                size="sm"
                fullWidth
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button
                variant="filled"
                color="success"
                size="sm"
                fullWidth
                onClick={handleAccept}
              >
                Accept
              </Button>
            </div>
          </div>
        )}

        {/* Multi-file review state */}
        {status === 'reviewing-multi' && pendingMultiChanges.length > 0 && (
          <div className="review-state">
            <div className="review-header">
              <IconFiles size={12} />
              <span>Review Changes ({pendingMultiChanges.length} files)</span>
            </div>
            <MultiFileDiffView
              changes={pendingMultiChanges}
              onAccept={handleMultiFileAccept}
              onReject={handleMultiFileReject}
              onAcceptAll={handleMultiFileAcceptAll}
              onRejectAll={handleMultiFileRejectAll}
              onComplete={handleMultiFileComplete}
            />
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="ai-panel-input">
        {/* File selector at bottom */}
        {showFileSelector && collection && (
          <div className="file-selector-panel">
            <FileSelector collectionUid={collection.uid} />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <button
              type="button"
              className={`attachment-btn ${showFileSelector ? 'active' : ''}`}
              onClick={() => setShowFileSelector(!showFileSelector)}
              title={showFileSelector ? 'Close file selector' : 'Attach files'}
            >
              <IconPaperclip size={14} />
            </button>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedFilesForAI.length > 0
                  ? 'Ask anything about your API...'
                  : 'Attach files to start'
              }
              disabled={status !== 'idle' || selectedFilesForAI.length === 0}
              rows={1}
            />
            <div className="send-btn-wrapper">
              {status === 'generating' ? (
                <button
                  type="button"
                  className="send-btn stop"
                  onClick={handleStopGeneration}
                  title="Stop"
                >
                  <IconPlayerStop size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="send-btn"
                  disabled={!inputValue.trim() || selectedFilesForAI.length === 0}
                  title="Send message (Enter)"
                >
                  <IconSend size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="input-footer">
            <div className="input-controls">
              <ModeSelector
                currentMode={aiMode}
                onModeChange={(mode) => dispatch(setAIMode(mode))}
                disabled={status === 'generating'}
              />
            </div>

            {/* Selected files chips */}
            {selectedFilesForAI.length > 0 && (
              <div className="selected-files-row">
                <div className="selected-files-chips">
                  {selectedFilesForAI.map((file) => (
                    <div key={file.itemUid} className="file-chip">
                      <span className={`method ${(file.method || 'GET').toLowerCase()}`}>
                        {(file.method || 'GET').substring(0, 3)}
                      </span>
                      <span className="name">{file.name}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => dispatch(removeFileFromAISelection(file.itemUid))}
                        title={`Remove ${file.name}`}
                      >
                        <IconX size={8} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="clear-files-btn"
                  onClick={() => dispatch(clearAIFileSelection())}
                  title="Clear all files"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </StyledWrapper>
  );
};

export default AIAssistantPanel;
