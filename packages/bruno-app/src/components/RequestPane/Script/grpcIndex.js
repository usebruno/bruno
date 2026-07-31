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
import { getActiveGrpcScriptTab } from 'utils/tabs';

// The four phases of a gRPC call, in the order they run.
const GRPC_SCRIPT_PHASES = [
  {
    field: 'beforeCallStart',
    scriptType: 'grpc:before-call-start',
    label: 'Before Call',
    hints: ['bru'],
    errorMessageKey: 'beforeCallStartScriptErrorMessage'
  },
  {
    field: 'beforeMessageSend',
    scriptType: 'grpc:before-message-send',
    label: 'Before Message',
    hints: ['bru'],
    errorMessageKey: 'beforeMessageSendScriptErrorMessage'
  },
  {
    field: 'afterMessageReceive',
    scriptType: 'grpc:after-message-receive',
    label: 'After Message',
    hints: ['bru'],
    errorMessageKey: 'afterMessageReceiveScriptErrorMessage'
  },
  {
    field: 'afterCallEnd',
    scriptType: 'grpc:after-call-end',
    label: 'After Call',
    hints: ['bru'],
    errorMessageKey: 'afterCallEndScriptErrorMessage'
  }
];

const GrpcScript = ({ item, collection }) => {
  const dispatch = useDispatch();

  // One ref per phase, created on demand — each phase's editor holds its own CodeMirror instance.
  const editorRefs = useRef({});
  const getEditorRef = (scriptType) => (editorRefs.current[scriptType] ??= { current: null });

  const getScript = (field) => {
    return item.draft ? get(item, `draft.request.script.${field}`) : get(item, `request.script.${field}`);
  };

  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const scriptPaneTab = focusedTab?.scriptPaneTab;

  const activeTab = getActiveGrpcScriptTab(scriptPaneTab, {
    beforeCallStart: getScript('beforeCallStart'),
    beforeMessageSend: getScript('beforeMessageSend'),
    afterMessageReceive: getScript('afterMessageReceive'),
    afterCallEnd: getScript('afterCallEnd')
  });

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const [scrollMap, setScrollMap] = usePersistedState({ key: `grpc-script-scroll-${item.uid}`, default: {} });

  // Refresh CodeMirror when tab becomes visible and restore scroll position.
  // CodeMirror's scrollTo() is silently ignored when the editor is inside a display:none container
  // (TabsContent hides inactive tabs via display:none). So the scroll set during componentDidMount
  // is lost for the hidden editor. After refresh() recalculates layout, we re-apply scrollTo().
  useEffect(() => {
    const timer = setTimeout(() => {
      const editor = getEditorRef(activeTab).current?.editor;
      if (!editor) return;

      editor.refresh();
      editor.scrollTo(null, scrollMap?.[activeTab] || 0);
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab]);

  // One subscription that follows the visible tab, since only the active phase's editor is on screen.
  useFocusErrorLine({
    uid: item.uid,
    editorRef: getEditorRef(activeTab),
    scriptPhase: activeTab
  });

  const onScriptEdit = (field, value) => {
    dispatch(
      updateScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid,
        field
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const onScriptTabChange = (tab) => {
    dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: tab }));
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={onScriptTabChange}>
        <TabsList>
          {GRPC_SCRIPT_PHASES.map(({ scriptType, field, label, errorMessageKey }) => {
            const script = getScript(field);
            const hasScript = script && script.trim().length > 0;

            return (
              <TabsTrigger key={scriptType} value={scriptType}>
                {label}
                {hasScript && <StatusDot type={item[errorMessageKey] ? 'error' : 'default'} />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {GRPC_SCRIPT_PHASES.map(({ scriptType, field, hints }) => (
          <TabsContent
            key={scriptType}
            value={scriptType}
            className="mt-2"
            dataTestId={`${scriptType}-script-editor`}
          >
            <div className="relative h-full">
              <CodeEditor
                ref={getEditorRef(scriptType)}
                collection={collection}
                item={item}
                requestType={item.type}
                docKey={`script:${scriptType}`}
                value={getScript(field) || ''}
                theme={displayedTheme}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
                onEdit={(value) => onScriptEdit(field, value)}
                mode="javascript"
                onRun={onRun}
                onSave={onSave}
                showHintsFor={hints}
                scriptType={scriptType}
                initialScroll={scrollMap?.[scriptType] || 0}
                onScroll={(pos) => setScrollMap({ ...scrollMap, [scriptType]: pos })}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default GrpcScript;
