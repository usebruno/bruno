import React from 'react';
import { useSelector } from 'react-redux';
import { NEW_ENVIRONMENT } from 'utils/importers/vault-secrets';

const VaultSecrets = ({ vaultKeys, config, onChange }) => {
  const globalEnvironments = useSelector((state) => state.globalEnvironments?.globalEnvironments) || [];
  const { enabled, target, environmentUid, environmentName, values } = config;

  const isGlobal = target === 'global';
  const selectedEnvironment
    = isGlobal && environmentUid !== NEW_ENVIRONMENT
      ? globalEnvironments.find((environment) => environment.uid === environmentUid)
      : null;
  const alreadySetNames = new Set((selectedEnvironment?.variables || []).map((variable) => variable.name));

  const update = (patch) => onChange({ ...config, ...patch });

  return (
    <div className="mt-4" data-testid="vault-secrets-section">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="checkbox cursor-pointer mt-0.5"
          data-testid="vault-secrets-toggle"
        />
        <div>
          <span className="checkbox-option-label">Vault secrets ({vaultKeys.length})</span>
          <p className="checkbox-option-description">
            Postman does not export vault values. Create secret variables for these keys so the imported requests can
            resolve them.
          </p>
        </div>
      </label>

      {enabled && (
        <div className="mt-3 pl-6">
          <label htmlFor="vaultTarget" className="block font-medium">
            Store secrets in
          </label>
          <select
            id="vaultTarget"
            className="block textbox mt-2 w-full"
            value={target}
            onChange={(e) => update({ target: e.target.value, environmentUid: NEW_ENVIRONMENT })}
            data-testid="vault-target-select"
          >
            <option value="global">Global environment</option>
            <option value="collection">Collection environment</option>
          </select>

          {isGlobal && globalEnvironments.length > 0 && (
            <select
              className="block textbox mt-2 w-full"
              value={environmentUid}
              onChange={(e) => update({ environmentUid: e.target.value })}
              data-testid="vault-environment-select"
            >
              <option value={NEW_ENVIRONMENT}>New environment</option>
              {globalEnvironments.map((environment) => (
                <option key={environment.uid} value={environment.uid}>
                  {environment.name}
                </option>
              ))}
            </select>
          )}

          {environmentUid === NEW_ENVIRONMENT && (
            <input
              type="text"
              className="block textbox mt-2 w-full"
              value={environmentName}
              onChange={(e) => update({ environmentName: e.target.value })}
              autoComplete="off"
              spellCheck="false"
              aria-label="Environment name"
              data-testid="vault-environment-name"
            />
          )}

          <p className="text-muted text-xs mt-2">
            {isGlobal
              ? 'Values are stored encrypted on this machine. Existing values are left unchanged.'
              : 'Collection environments are imported without values - add them in the environment editor afterwards.'}
          </p>

          <div className="mt-3">
            {vaultKeys.map(({ key, name }) => (
              <div key={key} className="flex items-center gap-2 mt-2">
                <span className="text-xs w-1/3 truncate" title={name}>
                  {name}
                </span>
                {!isGlobal || alreadySetNames.has(name) ? (
                  <span className="text-muted text-xs">{isGlobal ? 'Already set' : 'No value'}</span>
                ) : (
                  <input
                    type="password"
                    className="textbox flex-1"
                    value={values[name] || ''}
                    onChange={(e) => update({ values: { ...values, [name]: e.target.value } })}
                    placeholder="Value (optional)"
                    autoComplete="off"
                    spellCheck="false"
                    aria-label={name}
                    data-testid={`vault-secret-value-${name}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultSecrets;
