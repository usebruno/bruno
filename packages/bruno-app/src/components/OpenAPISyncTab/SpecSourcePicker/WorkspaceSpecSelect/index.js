import { useId } from 'react';
import { IconChevronDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import useWorkspaceApiSpecs from 'hooks/useWorkspaceApiSpecs';
import { findApiSpecByPathname, getSpecLabel } from 'utils/api-specs';
import { getOpenApiSpecError } from 'components/OpenAPISyncTab/SpecSourcePicker/utils';
import StyledWrapper from './StyledWrapper';

const WorkspaceSpecSelect = ({ value, onChange, onError }) => {
  const workspaceSpecs = useWorkspaceApiSpecs();
  const selectedSpec = findApiSpecByPathname(workspaceSpecs, value);
  const idPrefix = useId();
  const labelId = `${idPrefix}-label`;
  const valueId = `${idPrefix}-value`;

  const handleSelect = (spec) => {
    const error = getOpenApiSpecError(spec.json);
    onError(error);
    onChange(error ? '' : spec.pathname);
  };

  const renderTrigger = (text, { disabled = false, isPlaceholder = false } = {}) => (
    <button
      type="button"
      className="source-input spec-select-trigger"
      disabled={disabled}
      aria-labelledby={`${labelId} ${valueId}`}
      data-testid="spec-source-workspace-select"
    >
      <span id={valueId} className={isPlaceholder ? 'truncate placeholder' : 'truncate'}>{text}</span>
      <IconChevronDown className="caret" size={14} strokeWidth={2} />
    </button>
  );

  if (!workspaceSpecs.length) {
    return (
      <StyledWrapper>
        <span id={labelId} className="sr-only">API spec</span>
        {renderTrigger('No API specs in this workspace', { disabled: true, isPlaceholder: true })}
      </StyledWrapper>
    );
  }

  const items = workspaceSpecs.map((spec) => ({
    id: spec.uid,
    label: getSpecLabel(spec),
    onClick: () => handleSelect(spec)
  }));

  return (
    <StyledWrapper>
      <span id={labelId} className="sr-only">API spec</span>
      <MenuDropdown
        items={items}
        selectedItemId={selectedSpec?.uid}
        data-testid="spec-source-workspace-menu"
        menuClassName="max-h-44 overflow-y-auto"
        placement="bottom-start"
        appendTo={() => document.body}
        popperOptions={{ strategy: 'fixed' }}
        offset={[0, 0]}
        sameWidth
      >
        {selectedSpec
          ? renderTrigger(getSpecLabel(selectedSpec))
          : renderTrigger('Select an API spec', { isPlaceholder: true })}
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default WorkspaceSpecSelect;
