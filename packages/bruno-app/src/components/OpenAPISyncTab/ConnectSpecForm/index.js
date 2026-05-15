import { useState, useRef } from 'react';
import { IconCheck } from '@tabler/icons';
import Button from 'ui/Button';
import { isHttpUrl } from 'utils/url/index';
import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { parseFileAsJsonOrYaml } from 'utils/importers/file-reader';
import { useTranslation } from 'react-i18next';

const ConnectSpecForm = ({ sourceUrl, setSourceUrl, isLoading, error, setError, onConnect }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState('url');
  const fileInputRef = useRef(null);

  const FEATURES = [
    t('OPENAPI_SYNC.FEATURE_DETECT_ENDPOINTS'),
    t('OPENAPI_SYNC.FEATURE_TRACK_CHANGES'),
    t('OPENAPI_SYNC.FEATURE_SYNC_COLLECTION'),
    t('OPENAPI_SYNC.FEATURE_PRESERVE_TESTS')
  ];

  return (
    <div className="setup-section">
      <div className="setup-header">
        <h2 className="setup-title">{t('OPENAPI_SYNC.CONNECT_TITLE')}</h2>
        <p className="setup-description">
          {t('OPENAPI_SYNC.CONNECT_DESCRIPTION')}
        </p>
      </div>

      <form
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault(); onConnect();
        }}
      >
        <label className="url-label">{t('OPENAPI_SYNC.OPENAPI_SPECIFICATION')}</label>
        <div className="url-row">
          <div className="setup-mode-toggle">
            <button
              type="button"
              className={`setup-mode-btn ${mode === 'url' ? 'active' : ''}`}
              onClick={() => {
                setMode('url'); setSourceUrl('');
              }}
            >
              {t('OPENAPI_SYNC.URL')}
            </button>
            <button
              type="button"
              className={`setup-mode-btn ${mode === 'file' ? 'active' : ''}`}
              onClick={() => {
                setMode('file'); setSourceUrl('');
              }}
            >
              {t('OPENAPI_SYNC.FILE')}
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
                      setError(t('OPENAPI_SYNC.ERROR_INVALID_SPEC'));
                      return;
                    }
                    if (data.swagger && String(data.swagger).startsWith('2')) {
                      setError(t('OPENAPI_SYNC.ERROR_SWAGGER_NOT_SUPPORTED'));
                      return;
                    }
                    const filePath = window.ipcRenderer.getFilePath(file);
                    if (filePath) setSourceUrl(filePath);
                  } catch (err) {
                    setError(err.message || t('OPENAPI_SYNC.ERROR_READ_FILE'));
                  }
                }}
              />
              <button
                type="button"
                className="url-input file-pick-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                {sourceUrl ? sourceUrl.split(/[\\/]/).pop() : t('OPENAPI_SYNC.CHOOSE_FILE')}
              </button>
            </>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={mode === 'url' ? !isHttpUrl(sourceUrl.trim()) : !sourceUrl.trim()}
            loading={isLoading}
          >
            {t('OPENAPI_SYNC.CONNECT')}
          </Button>
        </div>
        <p className="setup-hint">
          {mode === 'url'
            ? t('OPENAPI_SYNC.SUPPORTS_OPENAPI')
            : t('OPENAPI_SYNC.SELECT_LOCAL_FILE')}
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

      <p className="beta-feedback-inline">
        {t('OPENAPI_SYNC.BETA_FEEDBACK')}{' '}
        <button
          type="button"
          className="beta-feedback-link"
          onClick={() => window?.ipcRenderer?.openExternal('https://github.com/usebruno/bruno/discussions/7401')}
        >
          {t('OPENAPI_SYNC.SHARE_FEEDBACK')}
        </button>
      </p>
    </div>
  );
};

export default ConnectSpecForm;
