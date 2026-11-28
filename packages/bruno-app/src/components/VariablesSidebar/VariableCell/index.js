import React, { useState } from 'react';
import { SCOPES } from '../constants';
import VariableValue from '../VariableValue';
import ValueEditor from '../ValueEditor';
import DefineVariableEditor from '../DefineVariableEditor';
import StyledWrapper from './StyledWrapper';

const VariableCell = ({
  section,
  row,
  collection,
  item,
  addToScopes,
  revealed,
  onToggleReveal,
  onOpenObject,
  actions
}) => {
  const [isEditing, setIsEditing] = useState(false);

  if (section.scope === SCOPES.UNDEFINED) {
    return (
      <DefineVariableEditor
        name={row.name}
        collection={collection}
        item={item}
        addToScopes={addToScopes}
        onDefine={actions.defineVariable}
      />
    );
  }

  const isEditable = section.editable && !row.readOnly;

  if (isEditing) {
    return (
      <ValueEditor
        row={row}
        collection={collection}
        item={item}
        isMasked={row.secret && !revealed}
        onSave={(text, dataType) => {
          setIsEditing(false);
          actions.saveValue(section, row, text, dataType);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const handleClick = (event) => {
    if (!isEditable || event.target.closest('.row-actions')) return;
    setIsEditing(true);
  };

  return (
    <StyledWrapper
      className={isEditable ? 'is-editable' : undefined}
      onClick={handleClick}
    >
      <VariableValue
        name={row.name}
        value={row.value}
        secret={row.secret}
        collection={collection}
        docKey={`variables-sidebar:${section.key}:${row.name}`}
        revealed={revealed}
        onToggleReveal={onToggleReveal}
        onOpenObject={onOpenObject}
        onClear={isEditable ? () => actions.clearValue(section, row) : undefined}
      />
    </StyledWrapper>
  );
};

export default VariableCell;
