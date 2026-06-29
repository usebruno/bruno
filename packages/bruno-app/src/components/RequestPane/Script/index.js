import React, { useEffect, useMemo, useRef } from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import { buildRequestContextFromItem } from 'utils/ai';
import { updateScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';
import StatusDot from 'components/StatusDot';
import { usePersistedState } from 'hooks/usePersistedState';
import { useFocusErrorLine } from 'hooks/useFocusErrorLine';

const getScriptPhases = (protocol = 'http') => {
  if (protocol === 'grpc') {
    return [
      {
        key: 'before-invoke',
        label: 'Before Invoke',
        field: 'req',
        hints: ['req', 'bru']
      },
      {
        key: 'on-message',
        label: 'On Message',
        field: 'stream',
        hints: ['req', 'stream', 'bru']
      },
      {
        key: 'after-response',
        label: 'After Response',
        field: 'res',
        hints: ['req', 'res', 'bru']
      }
    ];
  }

  return [
    {
      key: 'pre-request',
      label: 'Pre Request',
      field: 'req',
      hints: ['req', 'bru']
    },
    {
      key: 'post-response',
      label: 'Post Response',
      field: 'res',
      hints: ['req', 'res', 'bru']
    }
  ];
};

const Script = ({ item, collection, protocol = 'http' }) => {
  const dispatch = useDispatch();

  const editorRefs = useRef({});

  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const scriptPaneTab = focusedTab?.scriptPaneTab;

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const SCRIPT_PHASES = useMemo(() => getScriptPhases(protocol), [protocol]);

  const getEditorRef = (phaseKey) => {
    return (editorRefs.current[phaseKey] ??= { current: null });
  };

  const getScript = (field) => {
    return item.draft
      ? get(item, `draft.request.script.${field}`)
      : get(item, `request.script.${field}`);
  };

  const getDefaultTab = () => {
    const hasFirstScript = getScript(SCRIPT_PHASES[0].field);
    return hasFirstScript ? SCRIPT_PHASES[0].key : SCRIPT_PHASES[1]?.key;
  };

  const activeTab = scriptPaneTab || getDefaultTab();

  const [scrollMap, setScrollMap] = usePersistedState({
    key: `script-scroll-${item.uid}`,
    default: {}
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const activePhase = SCRIPT_PHASES.find((p) => p.key === activeTab);
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

  SCRIPT_PHASES.forEach((phase) => {
    useFocusErrorLine({
      uid: item.uid,
      editorRef: getEditorRef(phase.key),
      scriptPhase: phase.key,
      isVisible: activeTab === phase.key
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

  const requestContext = useMemo(() => buildRequestContextFromItem(item), [item]);

  const onScriptTabChange = (tab) => {
    dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: tab }));
  };

  const renderEditor = (phase) => {
    const value = getScript(phase.field);

    return (
      <div className="relative h-full">
        <CodeEditor
          ref={getEditorRef(phase.key)}
          collection={collection}
          item={item}
          protocol={protocol}
          docKey={`script:${phase.key}`}
          value={value || ''}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          mode="javascript"
          onEdit={(val) => onScriptEdit(phase.field, val)}
          onRun={onRun}
          onSave={onSave}
          showHintsFor={phase.hints}
          scriptType={phase.key}
          initialScroll={scrollMap?.[phase.key] || 0}
          onScroll={(pos) =>
            setScrollMap({
              ...scrollMap,
              [phase.key]: pos
            })}
        />
        <AIAssist
          scriptType={phase.key}
          currentScript={value || ''}
          requestContext={requestContext}
          onApply={(val) => onScriptEdit(phase.field, val)}
        />
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={onScriptTabChange}>
        <TabsList>
          {SCRIPT_PHASES.map((phase) => {
            const value = getScript(phase.field);
            const hasScript = value && value.trim().length > 0;

            return (
              <TabsTrigger key={phase.key} value={phase.key}>
                {phase.label}
                {hasScript && (
                  <StatusDot
                    type={
                      item?.[`${phase.key}ScriptErrorMessage`]
                        ? 'error'
                        : 'default'
                    }
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SCRIPT_PHASES.map((phase) => (
          <TabsContent
            key={phase.key}
            value={phase.key}
            className="mt-2"
            dataTestId={`${phase.key}-script-editor`}
          >
            {activeTab === phase.key ? renderEditor(phase) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Script;
