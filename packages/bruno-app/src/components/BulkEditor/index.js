import React, { useEffect, useMemo, useState } from 'react';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import { parseBulkKeyValue, serializeBulkKeyValue } from 'utils/common/bulkKeyValueUtils';

const BulkEditor = ({ params, onChange, onToggle, onSave, onRun }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();

  const itemsText = useMemo(() => serializeBulkKeyValue(params), [params]);
  // Editor local state
  const [editorText, setEditorText] = useState(itemsText);

  useEffect(() => {
    if (serializeBulkKeyValue(parseBulkKeyValue(editorText || '')) !== itemsText) {
      setEditorText(itemsText);
    }
  }, [editorText, itemsText]);

  const handleEdit = (value) => {
    if (value === editorText) {
      return;
    }

    setEditorText(value);
    onChange(parseBulkKeyValue(value || ''));
  };

  return (
    <>
      <div className="h-[200px]">
        <CodeEditor
          mode="text/plain"
          theme={displayedTheme}
          font={preferences.codeFont || 'default'}
          value={editorText}
          onEdit={handleEdit}
          onSave={onSave}
          onRun={onRun}
        />
      </div>
      <div className="flex btn-action justify-between items-center mt-3">
        <button className="text-link select-none ml-auto" onClick={onToggle}>
          Key/Value Edit
        </button>
      </div>
    </>
  );
};

export default BulkEditor;
