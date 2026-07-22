import React, { useMemo, useRef } from 'react';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import { parseBulkKeyValue, serializeBulkKeyValue } from 'utils/common/bulkKeyValueUtils';

/**
 * Preserve hidden metadata (uid, description, annotations) across a bulk edit
 * by matching parsed params back to the original set using name + proximity.
 */
const preserveMetadata = (parsed, original) => {
  // Build a lookup of original params grouped by name.
  const candidatesByName = new Map();
  original.forEach((param, index) => {
    const name = param.name || '';
    if (!candidatesByName.has(name)) {
      candidatesByName.set(name, []);
    }
    candidatesByName.get(name).push({ index, param, matched: false });
  });

  return parsed.map((item, index) => {
    const name = item.name || '';
    const candidates = candidatesByName.get(name);

    if (!candidates || candidates.length === 0) {
      return { ...item, description: '', annotations: null };
    }

    let best = null;
    let bestDistance = Infinity;

    for (const candidate of candidates) {
      if (candidate.matched) continue;
      const distance = Math.abs(candidate.index - index);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }

    if (best) {
      best.matched = true;
      return {
        ...item,
        uid: best.param.uid,
        description: best.param.description || '',
        annotations: best.param.annotations ?? null
      };
    }

    // All candidates for this name are already consumed (e.g. added duplicates).
    return { ...item, description: '', annotations: null };
  });
};

const BulkEditor = ({ params, onChange, onToggle, onSave, onRun }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();

  // Capture the original params on mount so we can preserve fields (like descriptions)
  // that aren't shown in the bulk editor but should survive the roundtrip.
  const originalParamsRef = useRef(params);

  const parsedParams = useMemo(() => serializeBulkKeyValue(params), [params]);

  const handleEdit = (value) => {
    const parsed = parseBulkKeyValue(value);
    const withPreservedMeta = preserveMetadata(parsed, originalParamsRef.current);
    onChange(withPreservedMeta);
  };

  return (
    <>
      <div className="h-[200px]">
        <CodeEditor
          mode="text/plain"
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={parsedParams}
          onEdit={handleEdit}
          onSave={onSave}
          onRun={onRun}
        />
      </div>
      <div className="flex btn-action justify-between items-center mt-3">
        <button className="text-link select-none ml-auto" data-testid="key-value-edit-toggle" onClick={onToggle}>
          Key/Value Edit
        </button>
      </div>
    </>
  );
};

export default BulkEditor;
