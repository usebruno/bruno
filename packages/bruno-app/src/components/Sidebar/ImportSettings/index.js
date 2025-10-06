import React, { useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const groupingOptions = [
  { value: 'tags', label: 'Tags', description: 'Group requests by OpenAPI tags', testId: 'grouping-option-tags' },
  { value: 'path', label: 'Paths', description: 'Group requests by URL path structure', testId: 'grouping-option-path' }
];

const ImportSettings = ({ groupingType, setGroupingType }) => {
  const dropdownTippyRef = useRef();

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
  };

  const GroupingDropdownIcon = forwardRef((props, ref) => {
    const selectedOption = groupingOptions.find((option) => option.value === groupingType);
    return (
      <div
        ref={ref}
        className="flex items-center justify-between w-full current-group"
        data-testid="grouping-dropdown"
      >
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedOption.label}</div>
        </div>
        <IconCaretDown size={16} className="text-gray-400 ml-[0.25rem]" fill="currentColor" />
      </div>
    );
  });

  return (
    <StyledWrapper>
      <div className="flex items-center">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Folder arrangement</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Select whether to create folders according to the spec's paths or tags.
          </p>
        </div>

        <div className="relative">
          <Dropdown onCreate={onDropdownCreate} icon={<GroupingDropdownIcon />} placement="bottom-start">
            {groupingOptions.map((option) => (
              <div
                key={option.value}
                className="dropdown-item"
                data-testid={option.testId}
                onClick={() => {
                  dropdownTippyRef?.current?.hide();
                  setGroupingType(option.value);
                }}
              >
                {option.label}
              </div>
            ))}
          </Dropdown>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ImportSettings;
