import { useMemo } from 'react';
import { IconChevronDown } from '@tabler/icons';
import useWorkspaceApiSpecs from 'hooks/useWorkspaceApiSpecs';
import { buildSpecSelectOptions, findApiSpecByPathname } from 'utils/api-specs';
import { getOpenApiSpecError } from 'components/OpenAPISyncTab/SpecSourcePicker/utils';
import StyledWrapper from './StyledWrapper';

const SELECT_CLASS_NAME = 'source-input text-centered with-caret';

const WorkspaceSpecSelect = ({ value, onChange, onError }) => {
  const workspaceSpecs = useWorkspaceApiSpecs();
  const options = useMemo(() => buildSpecSelectOptions(workspaceSpecs), [workspaceSpecs]);

  const handleChange = (e) => {
    const spec = workspaceSpecs.find((workspaceSpec) => workspaceSpec.uid === e.target.value);
    const error = spec ? getOpenApiSpecError(spec.json) : null;
    onError(error);
    onChange(spec && !error ? spec.pathname : '');
  };

  return (
    <StyledWrapper>
      {options.length ? (
        <select
          className={SELECT_CLASS_NAME}
          value={findApiSpecByPathname(workspaceSpecs, value)?.uid || ''}
          onChange={handleChange}
          aria-label="API spec"
          data-testid="spec-source-workspace-select"
        >
          <option value="">Select an API spec</option>
          {options.map((option) => (
            <option key={option.uid} value={option.uid}>{option.name}</option>
          ))}
        </select>
      ) : (
        <select className={SELECT_CLASS_NAME} disabled aria-label="API spec" data-testid="spec-source-workspace-select">
          <option>No API specs in this workspace</option>
        </select>
      )}
      <IconChevronDown className="select-caret" size={14} strokeWidth={2} />
    </StyledWrapper>
  );
};

export default WorkspaceSpecSelect;
