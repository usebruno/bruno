import React from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import CountBadge from 'ui/CountBadge';
import EnvironmentRow from '../EnvironmentRow';

const EnvironmentGroup = ({
  title,
  environments,
  countTestId,
  selected,
  toggleItemSelection,
  resolutions,
  setItemResolution,
  showResolutions,
  isExpanded,
  toggleExpanded,
  toggleGroupSelection,
  dataTestId
}) => {
  if (environments.length === 0) return null;

  const selectedCount = environments.filter((env) => selected.has(env.id)).length;
  const isAllSelected = environments.length > 0 && selectedCount === environments.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < environments.length;

  return (
    <div className="group-container" data-testid={dataTestId}>
      <div className="group-header">
        <div className="group-title-wrapper" onClick={toggleExpanded} role="button" tabIndex={0}>
          {isExpanded ? <IconChevronDown size={16} className="chevron-icon" strokeWidth={1.6} /> : <IconChevronRight size={16} className="chevron-icon" strokeWidth={1.6} />}
          <input
            type="checkbox"
            className="group-checkbox"
            ref={(input) => {
              if (input) {
                input.indeterminate = isIndeterminate;
              }
            }}
            checked={isAllSelected}
            onChange={(e) => {
              toggleGroupSelection(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid={`${dataTestId}-checkbox`}
          />
          <span className="group-title">{title}</span>
          <CountBadge className="group-count" data-testid={countTestId}>{environments.length}</CountBadge>
        </div>
      </div>
      {isExpanded && (
        <div className="group-list">
          {environments.map((env) => {
            const isSelected = selected.has(env.id);
            const resolution = resolutions ? resolutions.get(env.id) : null;
            return (
              <EnvironmentRow
                key={env.id}
                env={env}
                isSelected={isSelected}
                resolution={resolution}
                toggleItemSelection={toggleItemSelection}
                setItemResolution={setItemResolution}
                showResolutions={showResolutions}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnvironmentGroup;
