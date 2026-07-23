import React, { useEffect, useMemo, useRef } from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import { updateScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';
import StatusDot from 'components/StatusDot';
import { usePersistedState } from 'hooks/usePersistedState';
import { useFocusErrorLine } from 'hooks/useFocusErrorLine';
import { getPhasesByRequestType } from '@usebruno/common';

const Script = ({ item, collection }) => {
  const dispatch = useDispatch();

  const editorRefs = useRef({});

  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const scriptPaneTab = focusedTab?.scriptPaneTab;

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const SCRIPT_PHASES = useMemo(() => getPhasesByRequestType(item?.type), [item?.type]);

  const getEditorRef = (phaseKey) => {
    return (editorRefs.current[phaseKey] ??= { current: null });
  };

  const getScript = (field) => {
    return item.draft
      ? get(item, `draft.request.script.${field}`)
      : get(item, `request.script.${field}`);
  };

  const getDefaultTab = () => {
    const hasFirstScript = getScript(SCRIPT_PHASES[0].FIELD);
    return hasFirstScript ? SCRIPT_PHASES[0].SCRIPT_TYPE : SCRIPT_PHASES[1]?.SCRIPT_TYPE;
  };

  const activeTab = scriptPaneTab || getDefaultTab();

  const [scrollMap, setScrollMap] = usePersistedState({
    key: `script-scroll-${item.uid}`,
    default: {}
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activePhase = SCRIPT_PHASES.find(({ SCRIPT_TYPE }) => SCRIPT_TYPE === activeTab);
      if (!activePhase) return;

      const editorRef = getEditorRef(activeTab);

      const scroll = scrollMap?.[activeTab] || 0;

      if (editorRef.current?.editor) {
        editorRef.current.editor.refresh();
        editorRef.current.editor.scrollTo(null, scroll);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, SCRIPT_PHASES]);

  SCRIPT_PHASES.forEach(({ SCRIPT_TYPE }) => {
    useFocusErrorLine({
      uid: item.uid,
      editorRef: getEditorRef(SCRIPT_TYPE),
      scriptPhase: SCRIPT_TYPE,
      isVisible: activeTab === SCRIPT_TYPE
    });
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

  const { requestContext, variables: aiVariables } = useMemo(
    () => buildAiContextPayload(item, collection),
    [item, collection]
  );

  const onScriptTabChange = (tab) => {
    dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: tab }));
  };

  const renderEditor = ({ SCRIPT_TYPE, FIELD, HINTS }) => {
    const value = getScript(FIELD);

    return (
      <div className="relative h-full">
        <CodeEditor
          ref={getEditorRef(SCRIPT_TYPE)}
          collection={collection}
          item={item}
          requestType={item?.type}
          docKey={`script:${SCRIPT_TYPE}`}
          value={value || ''}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          mode="javascript"
          onEdit={(val) => onScriptEdit(FIELD, val)}
          onRun={onRun}
          onSave={onSave}
          showHintsFor={HINTS}
          scriptType={SCRIPT_TYPE}
          initialScroll={scrollMap?.[SCRIPT_TYPE] || 0}
          onScroll={(pos) =>
            setScrollMap({
              ...scrollMap,
              [SCRIPT_TYPE]: pos
            })}
        />
        <AIAssist
          scriptType={SCRIPT_TYPE}
          currentScript={value || ''}
          requestContext={requestContext}
          onApply={(val) => onScriptEdit(FIELD, val)}
        />
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={onScriptTabChange}>
        <TabsList>
          {SCRIPT_PHASES.map((phase) => {
            const value = getScript(phase.FIELD);
            const hasScript = value && value.trim().length > 0;

            return (
              <TabsTrigger key={phase.SCRIPT_TYPE} value={phase.SCRIPT_TYPE}>
                {phase.LABEL}
                {hasScript && (
                  <StatusDot
                    type={
                      item?.[`${phase.SCRIPT_TYPE}ScriptErrorMessage`]
                        ? 'error'
                        : 'default'
                    }
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SCRIPT_PHASES.map((phase) => {
          return (
            <TabsContent
              key={phase.SCRIPT_TYPE}
              value={phase.SCRIPT_TYPE}
              className="mt-2"
              dataTestId={`${phase.SCRIPT_TYPE}-script-editor`}
            >
              {activeTab === phase.SCRIPT_TYPE ? renderEditor(phase) : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default Script;
