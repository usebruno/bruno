import React from 'react';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import SensitiveWarningPopover from './SensitiveWarningPopover';

const SensitiveFieldWarning = ({ fieldName, secretName, value, collection, item, readOnly, onReplaceValue }) => {
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
      readOnly={readOnly}
      onReplaceValue={onReplaceValue}
    />
  );
};

export default SensitiveFieldWarning;
