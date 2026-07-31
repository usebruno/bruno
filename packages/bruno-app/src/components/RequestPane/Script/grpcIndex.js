import React, { useEffect, useRef } from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { getGrpcScriptingPhases } from '@usebruno/common';
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

const GRPC_SCRIPT_PHASES = getGrpcScriptingPhases();

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
          {GRPC_SCRIPT_PHASES.map(({ SCRIPT_TYPE, FIELD, LABEL, ERROR_STATE_KEY }) => {
            const script = getScript(FIELD);
            const hasScript = script && script.trim().length > 0;

            return (
              <TabsTrigger key={SCRIPT_TYPE} value={SCRIPT_TYPE}>
                {LABEL}
                {hasScript && <StatusDot type={item[`${ERROR_STATE_KEY}Message`] ? 'error' : 'default'} />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {GRPC_SCRIPT_PHASES.map(({ SCRIPT_TYPE, FIELD, HINTS }) => (
          <TabsContent
            key={SCRIPT_TYPE}
            value={SCRIPT_TYPE}
            className="mt-2"
            dataTestId={`${SCRIPT_TYPE}-script-editor`}
          >
            <div className="relative h-full">
              <CodeEditor
                ref={getEditorRef(SCRIPT_TYPE)}
                collection={collection}
                item={item}
                requestType={item.type}
                docKey={`script:${SCRIPT_TYPE}`}
                value={getScript(FIELD) || ''}
                theme={displayedTheme}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
                onEdit={(value) => onScriptEdit(FIELD, value)}
                mode="javascript"
                onRun={onRun}
                onSave={onSave}
                showHintsFor={HINTS}
                scriptType={SCRIPT_TYPE}
                initialScroll={scrollMap?.[SCRIPT_TYPE] || 0}
                onScroll={(pos) => setScrollMap({ ...scrollMap, [SCRIPT_TYPE]: pos })}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default GrpcScript;
