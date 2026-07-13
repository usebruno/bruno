import React from 'react';
import ActionIcon from 'ui/ActionIcon';

const ColumnSortHeader = ({ label, onCycle, SortIcon, sortLabel, testId = 'column-sort-toggle' }) => (
  <span className="column-sort-header inline-flex items-center gap-1">
    {label}
    <ActionIcon label={sortLabel} size="sm" onClick={onCycle} data-testid={testId}>
      <SortIcon size={13} strokeWidth={1.5} />
    </ActionIcon>
  </span>
);

export default ColumnSortHeader;
