import React, { useEffect, useRef } from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';
import StatusDot from 'components/StatusDot';
import { usePersistedState } from 'hooks/usePersistedState';
import { useFocusErrorLine } from 'hooks/useFocusErrorLine';

/**
 * The gRPC counterpart of ./index.js: same editor per tab, but a gRPC call has four script phases
 * instead of HTTP's pre-request/post-response pair, and each phase's script is stored under its own
 * `request.script.<field>` via the shared `updateScript` reducer.
 */
const GrpcScript = ({ item, collection }) => {
  const dispatch = useDispatch();
  const beforeCallStartEditorRef = useRef(null);
  const beforeMessageSendEditorRef = useRef(null);
  const afterMessageReceiveEditorRef = useRef(null);
  const afterCallEndEditorRef = useRef(null);

  const beforeCallStartScript = item.draft ? get(item, 'draft.request.script.beforeCallStart') : get(item, 'request.script.beforeCallStart');
  const beforeMessageSendScript = item.draft ? get(item, 'draft.request.script.beforeMessageSend') : get(item, 'request.script.beforeMessageSend');
  const afterMessageReceiveScript = item.draft ? get(item, 'draft.request.script.afterMessageReceive') : get(item, 'request.script.afterMessageReceive');
  const afterCallEndScript = item.draft ? get(item, 'draft.request.script.afterCallEnd') : get(item, 'request.script.afterCallEnd');

  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const scriptPaneTab = focusedTab?.scriptPaneTab;

  // Default to the first phase that has a script, so a call scripted only at the end doesn't land on
  // an empty Before Call tab (only when scriptPaneTab is null/undefined)
  const getDefaultTab = () => {
    if (beforeCallStartScript && beforeCallStartScript.trim().length > 0) return 'grpc:before-call-start';
    if (beforeMessageSendScript && beforeMessageSendScript.trim().length > 0) return 'grpc:before-message-send';
    if (afterMessageReceiveScript && afterMessageReceiveScript.trim().length > 0) return 'grpc:after-message-receive';
    if (afterCallEndScript && afterCallEndScript.trim().length > 0) return 'grpc:after-call-end';
    return 'grpc:before-call-start';
  };

  const activeTab = scriptPaneTab || getDefaultTab();

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const [beforeCallStartScroll, setBeforeCallStartScroll] = usePersistedState({ key: `grpc-before-call-start-scroll-${item.uid}`, default: 0 });
  const [beforeMessageSendScroll, setBeforeMessageSendScroll] = usePersistedState({ key: `grpc-before-message-send-scroll-${item.uid}`, default: 0 });
  const [afterMessageReceiveScroll, setAfterMessageReceiveScroll] = usePersistedState({ key: `grpc-after-message-receive-scroll-${item.uid}`, default: 0 });
  const [afterCallEndScroll, setAfterCallEndScroll] = usePersistedState({ key: `grpc-after-call-end-scroll-${item.uid}`, default: 0 });

  // Refresh CodeMirror when tab becomes visible and restore scroll position.
  // CodeMirror's scrollTo() is silently ignored when the editor is inside a display:none container
  // (TabsContent hides inactive tabs via display:none). So the scroll set during componentDidMount
  // is lost for the hidden editor. After refresh() recalculates layout, we re-apply scrollTo().
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'grpc:before-call-start' && beforeCallStartEditorRef.current?.editor) {
        beforeCallStartEditorRef.current.editor.refresh();
        beforeCallStartEditorRef.current.editor.scrollTo(null, beforeCallStartScroll);
      } else if (activeTab === 'grpc:before-message-send' && beforeMessageSendEditorRef.current?.editor) {
        beforeMessageSendEditorRef.current.editor.refresh();
        beforeMessageSendEditorRef.current.editor.scrollTo(null, beforeMessageSendScroll);
      } else if (activeTab === 'grpc:after-message-receive' && afterMessageReceiveEditorRef.current?.editor) {
        afterMessageReceiveEditorRef.current.editor.refresh();
        afterMessageReceiveEditorRef.current.editor.scrollTo(null, afterMessageReceiveScroll);
      } else if (activeTab === 'grpc:after-call-end' && afterCallEndEditorRef.current?.editor) {
        afterCallEndEditorRef.current.editor.refresh();
        afterCallEndEditorRef.current.editor.scrollTo(null, afterCallEndScroll);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab]);

  useFocusErrorLine({
    uid: item.uid,
    editorRef: beforeCallStartEditorRef,
    scriptPhase: 'grpc:before-call-start',
    isVisible: activeTab === 'grpc:before-call-start'
  });

  useFocusErrorLine({
    uid: item.uid,
    editorRef: beforeMessageSendEditorRef,
    scriptPhase: 'grpc:before-message-send',
    isVisible: activeTab === 'grpc:before-message-send'
  });

  useFocusErrorLine({
    uid: item.uid,
    editorRef: afterMessageReceiveEditorRef,
    scriptPhase: 'grpc:after-message-receive',
    isVisible: activeTab === 'grpc:after-message-receive'
  });

  useFocusErrorLine({
    uid: item.uid,
    editorRef: afterCallEndEditorRef,
    scriptPhase: 'grpc:after-call-end',
    isVisible: activeTab === 'grpc:after-call-end'
  });

  const onBeforeCallStartEdit = (value) => {
    dispatch(
      updateScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid,
        field: 'beforeCallStart'
      })
    );
  };

  const onBeforeMessageSendEdit = (value) => {
    dispatch(
      updateScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid,
        field: 'beforeMessageSend'
      })
    );
  };

  const onAfterMessageReceiveEdit = (value) => {
    dispatch(
      updateScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid,
        field: 'afterMessageReceive'
      })
    );
  };

  const onAfterCallEndEdit = (value) => {
    dispatch(
      updateScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid,
        field: 'afterCallEnd'
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const hasBeforeCallStartScript = beforeCallStartScript && beforeCallStartScript.trim().length > 0;
  const hasBeforeMessageSendScript = beforeMessageSendScript && beforeMessageSendScript.trim().length > 0;
  const hasAfterMessageReceiveScript = afterMessageReceiveScript && afterMessageReceiveScript.trim().length > 0;
  const hasAfterCallEndScript = afterCallEndScript && afterCallEndScript.trim().length > 0;

  const onScriptTabChange = (tab) => {
    dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: tab }));
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={onScriptTabChange}>
        <TabsList>
          <TabsTrigger value="grpc:before-call-start">
            Before Call
            {hasBeforeCallStartScript && (
              <StatusDot type={item.beforeCallStartScriptErrorMessage ? 'error' : 'default'} />
            )}
          </TabsTrigger>
          <TabsTrigger value="grpc:before-message-send">
            Before Message
            {hasBeforeMessageSendScript && (
              <StatusDot type={item.beforeMessageSendScriptErrorMessage ? 'error' : 'default'} />
            )}
          </TabsTrigger>
          <TabsTrigger value="grpc:after-message-receive">
            After Message
            {hasAfterMessageReceiveScript && (
              <StatusDot type={item.afterMessageReceiveScriptErrorMessage ? 'error' : 'default'} />
            )}
          </TabsTrigger>
          <TabsTrigger value="grpc:after-call-end">
            After Call
            {hasAfterCallEndScript && (
              <StatusDot type={item.afterCallEndScriptErrorMessage ? 'error' : 'default'} />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grpc:before-call-start" className="mt-2" dataTestId="grpc:before-call-start-script-editor">
          <div className="relative h-full">
            <CodeEditor
              ref={beforeCallStartEditorRef}
              collection={collection}
              item={item}
              requestType={item.type}
              docKey="script:grpc:before-call-start"
              value={beforeCallStartScript || ''}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              onEdit={onBeforeCallStartEdit}
              mode="javascript"
              onRun={onRun}
              onSave={onSave}
              showHintsFor={['bru']}
              scriptType="grpc:before-call-start"
              initialScroll={beforeCallStartScroll}
              onScroll={setBeforeCallStartScroll}
            />
          </div>
        </TabsContent>

        <TabsContent value="grpc:before-message-send" className="mt-2" dataTestId="grpc:before-message-send-script-editor">
          <div className="relative h-full">
            <CodeEditor
              ref={beforeMessageSendEditorRef}
              collection={collection}
              item={item}
              requestType={item.type}
              docKey="script:grpc:before-message-send"
              value={beforeMessageSendScript || ''}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              onEdit={onBeforeMessageSendEdit}
              mode="javascript"
              onRun={onRun}
              onSave={onSave}
              showHintsFor={['bru']}
              scriptType="grpc:before-message-send"
              initialScroll={beforeMessageSendScroll}
              onScroll={setBeforeMessageSendScroll}
            />
          </div>
        </TabsContent>

        <TabsContent value="grpc:after-message-receive" className="mt-2" dataTestId="grpc:after-message-receive-script-editor">
          <div className="relative h-full">
            <CodeEditor
              ref={afterMessageReceiveEditorRef}
              collection={collection}
              item={item}
              requestType={item.type}
              docKey="script:grpc:after-message-receive"
              value={afterMessageReceiveScript || ''}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              onEdit={onAfterMessageReceiveEdit}
              mode="javascript"
              onRun={onRun}
              onSave={onSave}
              showHintsFor={['bru']}
              scriptType="grpc:after-message-receive"
              initialScroll={afterMessageReceiveScroll}
              onScroll={setAfterMessageReceiveScroll}
            />
          </div>
        </TabsContent>

        <TabsContent value="grpc:after-call-end" className="mt-2" dataTestId="grpc:after-call-end-script-editor">
          <div className="relative h-full">
            <CodeEditor
              ref={afterCallEndEditorRef}
              collection={collection}
              item={item}
              requestType={item.type}
              docKey="script:grpc:after-call-end"
              value={afterCallEndScript || ''}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              onEdit={onAfterCallEndEdit}
              mode="javascript"
              onRun={onRun}
              onSave={onSave}
              showHintsFor={['bru']}
              scriptType="grpc:after-call-end"
              initialScroll={afterCallEndScroll}
              onScroll={setAfterCallEndScroll}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GrpcScript;
