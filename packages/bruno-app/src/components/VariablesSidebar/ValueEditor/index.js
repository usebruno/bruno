import React, { useCallback, useRef, useState } from 'react';
import { valueToString } from '@usebruno/common/utils';
import { useTheme } from 'providers/Theme';
import useOnClickOutside from 'hooks/useOnClickOutside';
import MultiLineEditor from 'components/MultiLineEditor';
import DataTypeSelector from 'components/DataTypeSelector';
import VarValueCell from 'components/VarValueCell';
import { AUTOCOMPLETE_TRIGGER } from 'utils/common/constants';
import { isInsideFloatingMenu, focusAtEnd } from '../utils';

const ValueEditor = ({ row, collection, item, isMasked, onSave, onCancel }) => {
  const { displayedTheme } = useTheme();
  const containerRef = useRef(null);
  const [initialText] = useState(() => valueToString(row.rawValue, 2));
  const [text, setText] = useState(initialText);
  const [dataType, setDataType] = useState(row.dataType || 'string');

  const commit = () => {
    if (text === initialText && dataType === (row.dataType || 'string')) {
      onCancel();
      return;
    }
    onSave(text, dataType);
  };

  useOnClickOutside(containerRef, (event) => {
    if (!isInsideFloatingMenu(event.target)) commit();
  });

  const focusEditor = useCallback((instance) => focusAtEnd(instance?.editor), []);

  return (
    <div
      ref={containerRef}
      className="value-editing flex-1 min-w-0"
      data-testid="variables-sidebar-value-editor"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <VarValueCell
        editor={(
          <MultiLineEditor
            ref={focusEditor}
            theme={displayedTheme}
            collection={collection}
            item={item}
            name={`variables-sidebar.${row.name}`}
            value={text}
            isSecret={isMasked}
            onChange={setText}
            onSave={commit}
            variableAutocomplete={AUTOCOMPLETE_TRIGGER.DOUBLE_BRACE}
          />
        )}
        renderTypeSelector={({ compact }) => (
          <DataTypeSelector
            compact={compact}
            variable={{ uid: row.uid, value: text, dataType }}
            onChange={(fields) => setDataType(fields.dataType || 'string')}
          />
        )}
      />
    </div>
  );
};

export default ValueEditor;
