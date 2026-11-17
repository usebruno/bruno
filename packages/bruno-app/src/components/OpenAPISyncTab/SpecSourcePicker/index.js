import { useId } from 'react';
import Tab from 'components/Tab';
import WorkspaceSpecSelect from './WorkspaceSpecSelect';
import SpecFilePicker from './SpecFilePicker';
import StyledWrapper from './StyledWrapper';

const SOURCE_TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'url', label: 'URL' },
  { key: 'file', label: 'File' }
];

const SpecSourcePicker = ({ variant, mode, onModeChange, value, onChange, onError, action }) => {
  const idPrefix = useId();
  const panelId = `${idPrefix}-panel`;
  const tabId = (key) => `${idPrefix}-tab-${key}`;

  return (
    <StyledWrapper className={variant}>
      <div className="tabs" role="tablist" aria-label="Spec source">
        {SOURCE_TABS.map((tab) => (
          <Tab
            key={tab.key}
            id={tabId(tab.key)}
            aria-controls={panelId}
            name={tab.key}
            label={tab.label}
            isActive={mode === tab.key}
            onClick={onModeChange}
          />
        ))}
      </div>
      <div className="source-row" role="tabpanel" id={panelId} aria-labelledby={tabId(mode)}>
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
            aria-label="OpenAPI spec URL"
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
