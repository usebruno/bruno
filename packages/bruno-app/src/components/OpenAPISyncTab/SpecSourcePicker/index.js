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
  return (
    <StyledWrapper className={variant}>
      <div className="tabs" role="tablist">
        {SOURCE_TABS.map((tab) => (
          <Tab key={tab.key} name={tab.key} label={tab.label} isActive={mode === tab.key} onClick={onModeChange} />
        ))}
      </div>
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
