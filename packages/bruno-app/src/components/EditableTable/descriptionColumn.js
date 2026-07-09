import React from 'react';
import MultiLineEditor from 'components/MultiLineEditor';

export const createDescriptionColumn = ({
  theme,
  onSave,
  onRun,
  collection,
  item,
  nameFromRowIndex = false,
  onDescriptionChange
}) => ({
  key: 'description',
  name: 'Description',
  placeholder: 'Description',
  width: '25%',
  render: ({ row, value, onChange, rowIndex }) => (
    <MultiLineEditor
      value={value || ''}
      theme={theme}
      onSave={onSave}
      onChange={
        onDescriptionChange
          ? (newValue) => onDescriptionChange(newValue, { row, onChange })
          : onChange
      }
      placeholder={!value ? 'Description' : ''}
      {...(onRun ? { onRun } : {})}
      {...(collection ? { collection } : {})}
      {...(item ? { item } : {})}
      {...(nameFromRowIndex && rowIndex !== undefined ? { name: `${rowIndex}.description` } : {})}
    />
  )
});
