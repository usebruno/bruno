import React from 'react';
import ActionIcon from 'ui/ActionIcon';

const ColumnSortHeader = ({ label, SortIcon, sortLabel, testId = 'column-sort-toggle' }) => (
  <span className="column-sort-header inline-flex items-center gap-1" data-testid={testId}>
    {label}
    {SortIcon && (
      <ActionIcon label={sortLabel} size="sm">
        <SortIcon size={13} strokeWidth={1.5} />
      </ActionIcon>
    )}
  </span>
);

export default ColumnSortHeader;
