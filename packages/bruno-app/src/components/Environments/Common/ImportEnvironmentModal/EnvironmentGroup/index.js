import React from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import CountBadge from 'ui/CountBadge';
import MenuDropdown from 'ui/MenuDropdown';
import { DropdownTrigger } from '../ReviewStep/StyledWrapper';
import EnvironmentRow from '../EnvironmentRow';
import { RESOLUTION_TYPES, RESOLUTION_LABELS } from '../utils';

const EnvironmentGroup = ({
  title,
  environments,
  countTestId,
  selected,
  toggleItemSelection,
  resolutions,
  setItemResolution,
  showResolutions,
  setGroupResolution,
  isExpanded,
  toggleExpanded,
  toggleGroupSelection,
  searchText,
  dataTestId
}) => {
  if (environments.length === 0 && !searchText) return null;

  const selectedCount = environments.filter((env) => selected.has(env.id)).length;
  const isAllSelected = environments.length > 0 && selectedCount === environments.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < environments.length;

  const getGroupResolutionState = () => {
    if (environments.length === 0 || !resolutions) return RESOLUTION_TYPES.CUSTOM;
    const allCopy = environments.every((env) => resolutions.get(env.id) === RESOLUTION_TYPES.COPY);
    if (allCopy) return RESOLUTION_TYPES.COPY;
    const allReplace = environments.every((env) => resolutions.get(env.id) === RESOLUTION_TYPES.REPLACE);
    if (allReplace) return RESOLUTION_TYPES.REPLACE;
    return RESOLUTION_TYPES.CUSTOM;
  };

  const getResolutionMenuItems = (onSetGroupResolution) => [
    { id: RESOLUTION_TYPES.COPY, label: RESOLUTION_LABELS[RESOLUTION_TYPES.COPY], onClick: () => onSetGroupResolution(RESOLUTION_TYPES.COPY) },
    { id: RESOLUTION_TYPES.REPLACE, label: RESOLUTION_LABELS[RESOLUTION_TYPES.REPLACE], onClick: () => onSetGroupResolution(RESOLUTION_TYPES.REPLACE) }
  ];

  const groupResolutionState = getGroupResolutionState();

  return (
    <div className="group-container" data-testid={dataTestId}>
      <div className="group-header">
        <div className="group-title-wrapper" onClick={toggleExpanded} role="button" tabIndex={0}>
          {isExpanded ? <IconChevronDown size={16} className="chevron-icon" /> : <IconChevronRight size={16} className="chevron-icon" />}
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
          <CountBadge variant="warning" className="ml-2" data-testid={countTestId}>{environments.length}</CountBadge>
        </div>
        {showResolutions && (
          <MenuDropdown
            items={getResolutionMenuItems(setGroupResolution)}
            selectedItemId={groupResolutionState !== RESOLUTION_TYPES.CUSTOM ? groupResolutionState : null}
          >
            <DropdownTrigger data-testid="env-import-group-dropdown">
              <span>
                {RESOLUTION_LABELS[groupResolutionState]}
              </span>
              <IconChevronDown size={14} className="icon-chevron" />
            </DropdownTrigger>
          </MenuDropdown>
        )}
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
          {environments.length === 0 && searchText && (
            <div className="empty-state">No {title.toLowerCase()} environments found matching your search</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnvironmentGroup;
