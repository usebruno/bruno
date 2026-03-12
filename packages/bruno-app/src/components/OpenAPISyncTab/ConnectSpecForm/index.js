import { useState, useRef } from 'react';
import { IconCheck } from '@tabler/icons';
import Button from 'ui/Button';
import { isValidUrl } from 'utils/url/index';
import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { parseFileAsJsonOrYaml } from 'utils/importers/file-reader';

const FEATURES = [
  'Detect new, modified, and removed endpoints',
  'Track local changes against the spec',
  'Sync collection with a single click',
  'Your tests, assertions, and scripts are preserved during sync'
];

const ConnectSpecForm = ({ sourceUrl, setSourceUrl, isLoading, error, setError, onConnect }) => {
  const [mode, setMode] = useState('url');
  const fileInputRef = useRef(null);

  return (
    <div className="setup-section">
      <div className="setup-header">
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
        <label className="url-label">OpenAPI Specification</label>
        <div className="url-row">
          <div className="setup-mode-toggle">
            <button
              type="button"
              className={`setup-mode-btn ${mode === 'url' ? 'active' : ''}`}
              onClick={() => {
                setMode('url'); setSourceUrl('');
              }}
            >
              URL
            </button>
            <button
              type="button"
              className={`setup-mode-btn ${mode === 'file' ? 'active' : ''}`}
              onClick={() => {
                setMode('file'); setSourceUrl('');
              }}
            >
              File
            </button>
          </div>

          {mode === 'url' ? (
            <input
              type="text"
              className="url-input"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://api.example.com/openapi.json"
            />
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  setSourceUrl('');
                  try {
                    const data = await parseFileAsJsonOrYaml(file);
                    if (!isOpenApiSpec(data)) {
                      setError('The selected file is not a valid OpenAPI 3.x specification');
                      return;
                    }
                    const filePath = window.ipcRenderer.getFilePath(file);
                    if (filePath) setSourceUrl(filePath);
                  } catch (err) {
                    setError(err.message || 'Failed to read the selected file');
                  }
                }}
              />
              <button
                type="button"
                className="url-input file-pick-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                {sourceUrl ? sourceUrl.split(/[\\/]/).pop() : 'Choose file...'}
              </button>
            </>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={mode === 'url' ? !isValidUrl(sourceUrl.trim()) : !sourceUrl.trim()}
            loading={isLoading}
          >
            Connect
          </Button>
        </div>
        <p className="setup-hint">
          {mode === 'url'
            ? 'Supports OpenAPI 3.x specifications in JSON or YAML format'
            : 'Select a local OpenAPI/Swagger JSON or YAML file'}
        </p>
        {error && (
          <p className="setup-error">{error}</p>
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
