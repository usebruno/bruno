import { useState } from 'react';
import { IconCheck } from '@tabler/icons';
import Button from 'ui/Button';
import OpenAPISyncIcon from 'components/Icons/OpenAPISync';
import useWorkspaceApiSpecs from 'hooks/useWorkspaceApiSpecs';
import SpecSourcePicker from 'components/OpenAPISyncTab/SpecSourcePicker';
import { isSpecSourceReady } from 'components/OpenAPISyncTab/SpecSourcePicker/utils';

const FEATURES = [
  'Detect new, modified, and removed endpoints',
  'Track local changes against the spec',
  'Sync collection with a single click',
  'Your tests, assertions, and scripts are preserved during sync'
];

const SOURCE_HINTS = {
  workspace: 'Select the spec from the active workspace',
  url: 'Supports OpenAPI 3.x specifications in JSON or YAML format',
  file: 'Select a local OpenAPI/Swagger JSON or YAML file'
};

const ConnectSpecForm = ({ sourceUrl, setSourceUrl, isLoading, error, setError, onConnect }) => {
  const [mode, setMode] = useState('workspace');
  const workspaceSpecs = useWorkspaceApiSpecs();

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setSourceUrl('');
    setError(null);
  };

  return (
    <div className="setup-section">
      <div className="setup-header">
        <OpenAPISyncIcon size={56} className="setup-icon" data-testid="openapi-connect-icon" />
        <h2 className="setup-title">Connect to OpenAPI Spec</h2>
        <p className="setup-description">
          Keep your collection synchronized with an OpenAPI specification. Changes in the spec will be detected automatically.
        </p>
      </div>

      <form
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault(); onConnect();
        }}
      >
        <SpecSourcePicker
          mode={mode}
          onModeChange={handleModeChange}
          value={sourceUrl}
          onChange={setSourceUrl}
          onError={setError}
          action={(
            <Button
              type="submit"
              size="sm"
              className="connect-button"
              disabled={!isSpecSourceReady(mode, sourceUrl, workspaceSpecs)}
              loading={isLoading}
            >
              Connect
            </Button>
          )}
        />
        <p className="setup-hint">{SOURCE_HINTS[mode]}</p>
        {error && (
          <p className="setup-error" data-testid="openapi-connect-error">{error}</p>
        )}
      </form>

      <div className="setup-features">
        {FEATURES.map((text) => (
          <div className="setup-feature" key={text}>
            <IconCheck size={16} />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConnectSpecForm;
