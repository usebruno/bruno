import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import registry from 'integrations/registry';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const buildIntegrationList = (preferences) => {
  const registered = registry.getRegisteredMetadata();
  const prefOnlyIds = Object.keys(preferences?.integrations || {}).filter(
    (id) => !registered.find((entry) => entry.id === id)
  );

  const prefOnlyEntries = prefOnlyIds.map((id) => ({ id, label: id }));
  return [...registered, ...prefOnlyEntries];
};

const Integrations = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const integrations = useMemo(() => buildIntegrationList(preferences), [preferences]);

  const handleToggle = useCallback((id, enabled) => {
    const nextPreferences = {
      ...preferences,
      integrations: {
        ...(preferences.integrations || {}),
        [id]: {
          ...(preferences.integrations?.[id] || {}),
          enabled
        }
      }
    };

    Promise.resolve(dispatch(savePreferences(nextPreferences)))
      .catch((err) => console.error('Failed to save preferences:', err));
  }, [dispatch, preferences]);

  const isEnabled = (id) => {
    return preferences?.integrations?.[id]?.enabled || false;
  };

  const hasIntegrations = integrations.length > 0;

  return (
    <StyledWrapper>
      <div className="integrations-header">
        <h2 className="text-lg font-medium">Integrations</h2>
        <p className="text-gray-500 dark:text-gray-400 text-wrap">
          Enable or disable integrations for this user. Changes take effect immediately and persist in Preferences.
        </p>
      </div>

      {hasIntegrations ? (
        <div className="integrations-list">
          {integrations.map((integration) => (
            <div key={integration.id} className="integration-item">
              <div className="integration-copy">
                <div className="integration-name">{integration.label || integration.id}</div>
                {integration.description && (
                  <div className="integration-description">{integration.description}</div>
                )}
              </div>
              <div className="integration-actions">
                {integration.docsUrl && (
                  <a
                    href={integration.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-500 text-sm"
                  >
                    Docs
                  </a>
                )}
                <label className="integration-toggle">
                  <input
                    type="checkbox"
                    checked={isEnabled(integration.id)}
                    aria-label={`${integration.label || integration.id} toggle`}
                    onChange={(e) => handleToggle(integration.id, e.target.checked)}
                    className="mousetrap"
                  />
                  <span>{isEnabled(integration.id) ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="integrations-empty">No integrations are registered yet.</div>
      )}
    </StyledWrapper>
  );
};

export default Integrations;
