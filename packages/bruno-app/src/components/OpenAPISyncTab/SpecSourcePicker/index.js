import { useMemo, useRef } from 'react';
import { IconChevronDown } from '@tabler/icons';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import useWorkspaceApiSpecs from 'hooks/useWorkspaceApiSpecs';
import { buildSpecSelectOptions, findApiSpecByPathname } from 'utils/api-specs';
import { parseFileAsJsonOrYaml } from 'utils/importers/file-reader';
import { getOpenApiSpecError } from 'components/OpenAPISyncTab/utils';
import StyledWrapper from './StyledWrapper';

const SOURCE_TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'url', label: 'URL' },
  { key: 'file', label: 'File' }
];

const SelectWithCaret = ({ children }) => (
  <div className="select-wrapper">
    {children}
    <IconChevronDown className="select-caret" size={14} strokeWidth={2} />
  </div>
);

const WorkspaceSpecSelect = ({ value, onChange, onError }) => {
  const workspaceSpecs = useWorkspaceApiSpecs();
  const options = useMemo(() => buildSpecSelectOptions(workspaceSpecs), [workspaceSpecs]);

  if (!options.length) {
    return (
      <SelectWithCaret>
        <select className="source-input workspace-select" disabled data-testid="spec-source-workspace-select">
          <option>No API specs in this workspace</option>
        </select>
      </SelectWithCaret>
    );
  }

  const handleChange = (e) => {
    const spec = workspaceSpecs.find((workspaceSpec) => workspaceSpec.uid === e.target.value);
    const error = spec ? getOpenApiSpecError(spec.json) : null;
    onError(error);
    onChange(spec && !error ? spec.pathname : '');
  };

  return (
    <SelectWithCaret>
      <select
        className="source-input workspace-select"
        value={findApiSpecByPathname(workspaceSpecs, value)?.uid || ''}
        onChange={handleChange}
        data-testid="spec-source-workspace-select"
      >
        <option value="">Select an API spec</option>
        {options.map((option) => (
          <option key={option.uid} value={option.uid}>{option.name}</option>
        ))}
      </select>
    </SelectWithCaret>
  );
};

const SpecFilePicker = ({ value, onChange, onError }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onError(null);
    onChange('');
    try {
      const data = await parseFileAsJsonOrYaml(file);
      const error = getOpenApiSpecError(data);
      if (error) {
        onError(error);
        return;
      }
      const filePath = window.ipcRenderer.getFilePath(file);
      if (filePath) onChange(filePath);
    } catch (err) {
      onError(err.message || 'Failed to read the selected file');
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.yaml,.yml"
        className="file-input"
        onChange={handleFileChange}
        data-testid="spec-source-file-input"
      />
      <button
        type="button"
        className="source-input file-pick-btn"
        onClick={() => fileInputRef.current?.click()}
        data-testid="spec-source-file-button"
      >
        {value ? value.split(/[\\/]/).pop() : 'Select File'}
      </button>
    </>
  );
};

const SpecSourcePicker = ({ mode, onModeChange, value, onChange, onError, action }) => {
  return (
    <StyledWrapper>
      <ResponsiveTabs tabs={SOURCE_TABS} activeTab={mode} onTabSelect={onModeChange} />
      <div className="source-row">
        {mode === 'workspace' && (
          <WorkspaceSpecSelect value={value} onChange={onChange} onError={onError} />
        )}
        {mode === 'url' && (
          <input
            type="text"
            className="source-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://api.example.com/openapi.json"
            data-testid="spec-source-url-input"
          />
        )}
        {mode === 'file' && (
          <SpecFilePicker value={value} onChange={onChange} onError={onError} />
        )}
        {action}
      </div>
    </StyledWrapper>
  );
};

export default SpecSourcePicker;
