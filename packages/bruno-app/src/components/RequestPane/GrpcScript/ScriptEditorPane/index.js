import React, { useEffect, useRef } from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { TabsContent } from 'components/Tabs';
import { useTheme } from 'providers/Theme';
import { usePersistedState } from 'hooks/usePersistedState';
import { useFocusErrorLine } from 'hooks/useFocusErrorLine';

/**
 * One script editor pane inside the gRPC Script tab. `scriptType` is the hook's phase name
 * (`before-call-start`), which doubles as the tab value and the phase that error traces are
 * reported against.
 *
 * The refresh()/scrollTo() workaround below also exists inline in components/RequestPane/Script —
 * the two are independent copies, so a fix to one does not reach the other.
 */
const ScriptEditorPane = ({ item, collection, scriptType, value, onEdit, onRun, onSave, showHintsFor, isActive }) => {
  const editorRef = useRef(null);
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [scroll, setScroll] = usePersistedState({ key: `request-${scriptType}-scroll-${item.uid}`, default: 0 });

  // CodeMirror silently ignores scrollTo() while the editor sits in a display:none container, which
  // is how TabsContent hides an inactive pane — so the scroll position set on mount is lost. Once
  // refresh() has recalculated layout for the now-visible pane, re-apply it.
  useEffect(() => {
    const timer = setTimeout(() => {
      const editor = editorRef.current?.editor;
      if (isActive && editor) {
        editor.refresh();
        editor.scrollTo(null, scroll);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isActive]);

  useFocusErrorLine({
    uid: item.uid,
    editorRef,
    scriptPhase: scriptType,
    isVisible: isActive
  });

  return (
    <TabsContent value={scriptType} className="mt-2" dataTestId={`${scriptType}-script-editor`}>
      <div className="relative h-full">
        <CodeEditor
          ref={editorRef}
          collection={collection}
          item={item}
          docKey={`script:${scriptType}`}
          value={value || ''}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          onEdit={onEdit}
          mode="javascript"
          onRun={onRun}
          onSave={onSave}
          showHintsFor={showHintsFor}
          scriptType={scriptType}
          initialScroll={scroll}
          onScroll={setScroll}
        />
      </div>
    </TabsContent>
  );
};

export default ScriptEditorPane;
