import React from 'react';
import { IconAlertCircle, IconCaretDown } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import { BRUNO_VARIABLE_DATATYPES, parseValueByDataType, validateDataTypeValue } from '@usebruno/common/utils';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';

const DataTypeSelector = ({ variable, onChange }) => {
  const selectedType = variable.dataType || 'string';
  const coercedValue = parseValueByDataType(variable.value, selectedType);
  const typeError = validateDataTypeValue(coercedValue, selectedType);

  const handleTypeChange = (type) => {
    onChange({ dataType: type === 'string' ? undefined : type });
  };

  const items = BRUNO_VARIABLE_DATATYPES.map((type) => ({
    id: type,
    label: type,
    onClick: () => handleTypeChange(type)
  }));

  return (
    <StyledWrapper>
      <div className="flex items-center relative">
        <MenuDropdown
          items={items}
          selectedItemId={selectedType}
          placement="bottom-end"
          showTickMark={true}
          appendTo={() => document.body}
        >
          <div className="flex items-center cursor-pointer select-none">
            <span className="type-label">{selectedType}</span>
            <IconCaretDown className="caret-icon ml-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
        {typeError && (
          <span className="ml-1">
            <IconAlertCircle
              data-tooltip-id={`type-error-${variable.uid}`}
              className="text-yellow-600 cursor-pointer"
              size={16}
            />
            <Tooltip
              className="tooltip-mod"
              id={`type-error-${variable.uid}`}
              content={typeError}
              place="top"
            />
          </span>
        )}
      </div>
    </StyledWrapper>
  );
};

export default React.memo(DataTypeSelector);
