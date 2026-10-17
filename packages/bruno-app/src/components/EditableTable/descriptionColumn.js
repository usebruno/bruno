import React from 'react';
import MultiLineEditor from 'components/MultiLineEditor';
import { AUTOCOMPLETE_TRIGGER } from 'utils/common/constants';

export const createDescriptionColumn = ({
  theme,
  onSave,
  onRun,
  collection,
  item,
  nameFromRowIndex = false,
  onDescriptionChange,
  readOnly
}) => ({
  key: 'description',
  name: 'Description',
  placeholder: 'Description',
  width: '25%',
  readOnly,
  render: ({ row, value, onChange, rowIndex, isLastEmptyRow }) => (
    <MultiLineEditor
      value={value || ''}
      theme={theme}
      onSave={onSave}
      readOnly={readOnly}
      onChange={
        onDescriptionChange
          ? (newValue) => onDescriptionChange(newValue, { row, onChange })
          : onChange
      }
      placeholder={(isLastEmptyRow && !value) ? 'Description' : ''}
      {...(onRun ? { onRun } : {})}
      {...(collection ? { collection } : {})}
      {...(item ? { item } : {})}
      {...(nameFromRowIndex && rowIndex !== undefined ? { name: `${rowIndex}.description` } : {})}
      variableAutocomplete={AUTOCOMPLETE_TRIGGER.DOUBLE_BRACE}
    />
  )
});
