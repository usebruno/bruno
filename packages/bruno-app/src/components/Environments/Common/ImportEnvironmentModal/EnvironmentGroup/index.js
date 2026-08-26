import React from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import CountBadge from 'ui/CountBadge';
import MenuDropdown from 'ui/MenuDropdown';
import { DropdownTrigger } from '../StyledWrapper';
import EnvironmentRow from '../EnvironmentRow';

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
  isExpanded,
  toggleExpanded,
  toggleGroupSelection,
  searchText,
  dataTestId
}) => {
  if (environments.length === 0) return null;

  const isAllSelected = environments.length > 0 && environments.every((env) => selected.has(env.id));

  const getDropdownValue = () => {
    if (environments.length === 0) return 'Custom';
    const allCopy = environments.every((env) => resolutions.get(env.id) === 'copy');
    if (allCopy) return 'copy';
    const allReplace = environments.every((env) => resolutions.get(env.id) === 'replace');
    if (allReplace) return 'replace';
    return 'Custom';
  };

  return (
    <div className={`group-container ${hasBorderBottom ? 'has-border-bottom' : ''}`} data-testid={dataTestId}>
      <div className="group-header">
        <div className="group-title-wrapper" onClick={toggleExpanded}>
          {isExpanded ? <IconChevronDown size={16} className="chevron-icon" /> : <IconChevronRight size={16} className="chevron-icon" />}
          <input
            type="checkbox"
            className="group-checkbox"
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
            items={[
              { id: 'copy', label: 'Import as copy', onClick: () => setGroupResolution('copy') },
              { id: 'replace', label: 'Replace existing', onClick: () => setGroupResolution('replace') }
            ]}
            selectedItemId={getDropdownValue() !== 'Custom' ? getDropdownValue() : null}
          >
            <DropdownTrigger data-testid="env-import-group-dropdown">
              <span>
                {getDropdownValue() === 'Custom' ? 'Custom' : getDropdownValue() === 'copy' ? 'Import as copy' : 'Replace existing'}
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
                toggleItemSelection={() => toggleItemSelection(env.id)}
                setItemResolution={(res) => setItemResolution(env.id, res)}
                showResolutions={showResolutions}
              />
            );
          })}
          {environments.length === 0 && searchText && (
            <div className="empty-state">No matching {title.toLowerCase()}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnvironmentGroup;
