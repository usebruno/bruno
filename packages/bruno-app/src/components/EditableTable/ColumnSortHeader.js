import React from 'react';
import ActionIcon from 'ui/ActionIcon';

const ColumnSortHeader = ({ label, SortIcon, sortLabel, testId = 'column-sort-toggle' }) => (
  <span className="column-sort-header inline-flex items-center gap-1" data-testid={testId}>
    {label}
    <span className="column-sort-icon inline-flex items-center justify-center flex-shrink-0 w-[19px] h-[19px]">
      {SortIcon && (
        <ActionIcon label={sortLabel} size={19}>
          <SortIcon size={13} strokeWidth={1.5} />
        </ActionIcon>
      )}
    </span>
  </span>
);

export default ColumnSortHeader;
