import React from 'react';
import {
  IconAlertCircle,
  IconBraces,
  IconCaretDown,
  IconNumbers,
  IconLetterT,
  IconToggleRight
} from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import { BRUNO_VARIABLE_DATATYPES, parseValueByDataType, validateDataTypeValue } from '@usebruno/common/utils';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';

const TYPE_ICONS = {
  string: IconLetterT,
  number: IconNumbers,
  boolean: IconToggleRight,
  object: IconBraces
};

const TYPE_ICONS_SIZES = {
  string: 16,
  number: 18,
  boolean: 18,
  object: 18
};

const DataTypeSelector = ({ variable, onChange, compact = false }) => {
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

  const TypeIcon = TYPE_ICONS[selectedType] || IconLetterT;

  return (
    <StyledWrapper>
      <div className="flex items-center relative shrink-0">
        <MenuDropdown
          items={items}
          selectedItemId={selectedType}
          placement="bottom-end"
          showTickMark={true}
          appendTo={() => document.body}
          data-testid="datatype-selector-trigger"
        >
          <div
            className="flex items-center cursor-pointer select-none"
            data-selected-type={selectedType}
            aria-label={`Data type: ${selectedType}`}
          >
            {compact ? (
              <TypeIcon className="type-icon" size={TYPE_ICONS_SIZES[selectedType]} strokeWidth={2} />
            ) : (
              <span className="type-label">{selectedType}</span>
            )}
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
              positionStrategy="fixed"
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
