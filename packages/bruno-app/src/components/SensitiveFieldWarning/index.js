import React from 'react';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import SensitiveWarningPopover from './SensitiveWarningPopover';
import { useSensitiveFieldOwner } from './context';

const SensitiveFieldWarning = ({ fieldName, fieldKey, secretName, value, collection, item, onReplaceValue }) => {
  const owner = useSensitiveFieldOwner();
  const replaceValue = owner ? (newValue) => owner.updateField(fieldKey, newValue) : onReplaceValue;
  const { isSensitive } = useDetectSensitiveField(collection);
  const { showWarning, warningMessage, scope, variableName } = isSensitive(value, item);

  if (!showWarning) {
    return null;
  }

  return (
    <SensitiveWarningPopover
      fieldName={fieldName}
      secretName={secretName}
      warningMessage={warningMessage}
      scope={scope}
      variableName={variableName}
      value={value}
      collection={collection}
      item={item}
      onReplaceValue={replaceValue}
    />
  );
};

export default SensitiveFieldWarning;
