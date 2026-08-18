import React, { useMemo, useRef } from 'react';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import {
  parseBulkKeyValue,
  parseMultipartBulkKeyValue,
  serializeBulkKeyValue,
  serializeMultipartBulkKeyValue
} from 'utils/common/bulkKeyValueUtils';

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

/**
 * Same as preserveMetadata, but also keeps the multipart-specific fields
 * (contentType) intact when the parsed param matches an original of the same type.
 */
const preserveMultipartMetadata = (parsed, original) => {
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
      return { ...item, description: '', annotations: null, contentType: '' };
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
        annotations: best.param.annotations ?? null,
        contentType: best.param.type === item.type ? best.param.contentType || '' : ''
      };
    }

    return { ...item, description: '', annotations: null, contentType: '' };
  });
};

const BulkEditor = ({ params, onChange, onToggle, onSave, onRun, mode = 'keyValue' }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();

  const isMultipart = mode === 'multipart';

  // Capture the original params on mount so we can preserve fields (like descriptions)
  // that aren't shown in the bulk editor but should survive the roundtrip.
  const originalParamsRef = useRef(params);

  const parsedParams = useMemo(
    () => (isMultipart ? serializeMultipartBulkKeyValue(params) : serializeBulkKeyValue(params)),
    [params, isMultipart]
  );

  const handleEdit = (value) => {
    const parsed = isMultipart ? parseMultipartBulkKeyValue(value) : parseBulkKeyValue(value);
    const withPreservedMeta = isMultipart
      ? preserveMultipartMetadata(parsed, originalParamsRef.current)
      : preserveMetadata(parsed, originalParamsRef.current);
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
