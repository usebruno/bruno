import React, { useState, useEffect, useRef, useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { IconRobot } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor';
import { updateRequestScript, updateResponseScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { openAIPanel, updateAIPanelContext } from 'providers/ReduxStore/slices/app';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';
import StatusDot from 'components/StatusDot';

const Script = ({ item, collection }) => {
  const dispatch = useDispatch();
  const showAIPanel = useSelector((state) => state.app.showAIPanel);
  const preRequestEditorRef = useRef(null);
  const postResponseEditorRef = useRef(null);
  const requestScript = item.draft ? get(item, 'draft.request.script.req') : get(item, 'request.script.req');
  const responseScript = item.draft ? get(item, 'draft.request.script.res') : get(item, 'request.script.res');

  // Default to post-response if pre-request script is empty
  const getInitialTab = () => {
    const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
    return hasPreRequestScript ? 'pre-request' : 'post-response';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const prevItemUidRef = useRef(item.uid);

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const aiEnabled = preferences?.ai?.enabled;

  // Update active tab only when switching to a different item
  useEffect(() => {
    if (prevItemUidRef.current !== item.uid) {
      prevItemUidRef.current = item.uid;
      const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
      setActiveTab(hasPreRequestScript ? 'pre-request' : 'post-response');
    }
  }, [item.uid, requestScript]);

  // Refresh CodeMirror when tab becomes visible
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      if (activeTab === 'pre-request' && preRequestEditorRef.current?.editor) {
        preRequestEditorRef.current.editor.refresh();
      } else if (activeTab === 'post-response' && postResponseEditorRef.current?.editor) {
        postResponseEditorRef.current.editor.refresh();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab]);

  const onRequestScriptEdit = useCallback(
    (value) => {
      dispatch(
        updateRequestScript({
          script: value,
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    },
    [dispatch, item.uid, collection.uid]
  );

  const onResponseScriptEdit = useCallback(
    (value) => {
      dispatch(
        updateResponseScript({
          script: value,
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    },
    [dispatch, item.uid, collection.uid]
  );

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
  const hasPostResponseScript = responseScript && responseScript.trim().length > 0;

  const getCurrentScript = (tab = activeTab) => {
    return tab === 'pre-request' ? requestScript : responseScript;
  };

  const handleOpenAIPanel = () => {
    dispatch(openAIPanel({
      scriptType: activeTab,
      currentScript: getCurrentScript(),
      item,
      collection
    }));
  };

  // Update AI panel context when panel opens (e.g., via Cmd+L)
  useEffect(() => {
    if (showAIPanel) {
      dispatch(updateAIPanelContext({
        scriptType: activeTab,
        currentScript: getCurrentScript(activeTab),
        item,
        collection
      }));
    }
  }, [showAIPanel, item, collection, dispatch]);

  // Update AI panel context when tab changes
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // If AI panel is open, update its context with the new script type
    if (showAIPanel) {
      dispatch(updateAIPanelContext({
        scriptType: newTab,
        currentScript: getCurrentScript(newTab),
        item,
        collection
      }));
    }
  };

  return (
    <div className="w-full h-full flex relative">
      <div className="flex-1 flex flex-col pt-4">
        <div className="flex justify-between items-center">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="pre-request">
                Pre Request
                {hasPreRequestScript && <StatusDot />}
              </TabsTrigger>
              <TabsTrigger value="post-response">
                Post Response
                {hasPostResponseScript && <StatusDot />}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {aiEnabled && (
            <button
              onClick={handleOpenAIPanel}
              className={`flex items-center gap-1 px-2 py-1 mr-2 rounded text-xs transition-colors ${
                showAIPanel
                  ? 'bg-blue-500 text-white'
                  : 'bg-transparent hover:bg-gray-700 text-gray-400 hover:text-white'
              }`}
              title="AI Assistant (Cmd+L)"
            >
              <IconRobot size={14} />
              <span>AI</span>
            </button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="pre-request" className="mt-2" dataTestId="pre-request-script-editor">
            <CodeEditor
              ref={preRequestEditorRef}
              collection={collection}
              value={requestScript || ''}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              onEdit={onRequestScriptEdit}
              mode="javascript"
              onRun={onRun}
              onSave={onSave}
              showHintsFor={['req', 'bru']}
            />
          </TabsContent>

          <TabsContent value="post-response" className="mt-2" dataTestId="post-response-script-editor">
            <CodeEditor
              ref={postResponseEditorRef}
              collection={collection}
              value={responseScript || ''}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              onEdit={onResponseScriptEdit}
              mode="javascript"
              onRun={onRun}
              onSave={onSave}
              showHintsFor={['req', 'res', 'bru']}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Script;
