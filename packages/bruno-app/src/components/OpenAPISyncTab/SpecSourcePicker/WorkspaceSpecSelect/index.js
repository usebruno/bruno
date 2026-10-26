import { IconChevronDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import useWorkspaceApiSpecs from 'hooks/useWorkspaceApiSpecs';
import { findApiSpecByPathname, getSpecLabel } from 'utils/api-specs';
import { getOpenApiSpecError } from 'components/OpenAPISyncTab/SpecSourcePicker/utils';
import StyledWrapper from './StyledWrapper';

const TRIGGER_CLASS_NAME = 'source-input spec-select-trigger';

const WorkspaceSpecSelect = ({ value, onChange, onError }) => {
  const workspaceSpecs = useWorkspaceApiSpecs();
  const selectedSpec = findApiSpecByPathname(workspaceSpecs, value);

  const handleSelect = (spec) => {
    const error = getOpenApiSpecError(spec.json);
    onError(error);
    onChange(error ? '' : spec.pathname);
  };

  if (!workspaceSpecs.length) {
    return (
      <StyledWrapper>
        <button
          type="button"
          className={TRIGGER_CLASS_NAME}
          disabled
          aria-label="API spec"
          data-testid="spec-source-workspace-select"
        >
          <span className="truncate placeholder">No API specs in this workspace</span>
          <IconChevronDown className="caret" size={14} strokeWidth={2} />
        </button>
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
        <button
          type="button"
          className={TRIGGER_CLASS_NAME}
          aria-label="API spec"
          data-testid="spec-source-workspace-select"
        >
          <span className={selectedSpec ? 'truncate' : 'truncate placeholder'}>
            {selectedSpec ? getSpecLabel(selectedSpec) : 'Select an API spec'}
          </span>
          <IconChevronDown className="caret" size={14} strokeWidth={2} />
        </button>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default WorkspaceSpecSelect;
