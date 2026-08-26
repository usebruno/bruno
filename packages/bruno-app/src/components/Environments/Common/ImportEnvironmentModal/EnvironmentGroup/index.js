import React, { useState } from 'react';
import cx from 'classnames';
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
  hasBorderBottom,
  selected,
  toggleItemSelection,
  resolutions,
  setItemResolution,
  showResolutions,
  setGroupResolution,
  searchText,
  dataTestId
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (environments.length === 0) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

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
    <div className={cx('group-container', { 'has-border-bottom': hasBorderBottom })} data-testid={dataTestId}>
      <div className="group-header">
        <div className="group-title-wrapper" onClick={toggleExpanded}>
          {isExpanded ? <IconChevronDown size={16} className="chevron-icon" /> : <IconChevronRight size={16} className="chevron-icon" />}
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
