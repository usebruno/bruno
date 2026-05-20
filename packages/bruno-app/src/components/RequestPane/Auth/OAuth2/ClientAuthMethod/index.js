import React from 'react';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import { useTheme } from 'providers/Theme';
import { IconCaretDown } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import MenuDropdown from 'ui/MenuDropdown';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';

// OAuth 2.0 client authentication methods, RFC 7591 §2 / OIDC Core 1.0 §9.
const METHOD_OPTIONS = [
  { id: 'client_secret_basic', label: 'client_secret_basic' },
  { id: 'client_secret_post', label: 'client_secret_post' },
  { id: 'client_secret_jwt', label: 'client_secret_jwt' },
  { id: 'private_key_jwt', label: 'private_key_jwt' },
  { id: 'none', label: 'none' }
];

const SECRET_JWT_ALGS = ['HS256', 'HS384', 'HS512'];
const PRIVATE_KEY_JWT_ALGS = [
  'RS256', 'RS384', 'RS512',
  'PS256', 'PS384', 'PS512',
  'ES256', 'ES384', 'ES512',
  'EdDSA'
];

const algorithmOptions = (method) => {
  if (method === 'client_secret_jwt') return SECRET_JWT_ALGS;
  if (method === 'private_key_jwt') return PRIVATE_KEY_JWT_ALGS;
  return [];
};

const defaultAlgorithm = (method) => {
  if (method === 'client_secret_jwt') return 'HS256';
  if (method === 'private_key_jwt') return 'RS256';
  return '';
};

const ClientAuthMethod = ({ oAuth, handleChange, handleRun, handleSave, collection, item }) => {
  const { storedTheme } = useTheme();
  const { isSensitive } = useDetectSensitiveField(collection);

  const method = oAuth.tokenEndpointAuthMethod || 'client_secret_post';
  const algs = algorithmOptions(method);
  const currentAlg = oAuth.tokenEndpointAuthSigningAlg || (algs.length ? defaultAlgorithm(method) : '');
  const usesClientSecret = method === 'client_secret_basic' || method === 'client_secret_post' || method === 'client_secret_jwt';
  const isJwt = method === 'client_secret_jwt' || method === 'private_key_jwt';
  const isPrivateKeyJwt = method === 'private_key_jwt';
  const privateKeyFormat = oAuth.privateKeyFormat || 'pem';
  const privateKeyType = oAuth.privateKeyType || 'text';
  const privateKey = oAuth.privateKey || '';
  const sensitivity = isSensitive(privateKey);
  const clientSecret = oAuth.clientSecret || '';
  const clientSecretSensitivity = isSensitive(clientSecret);

  return (
    <>
      <div className="flex items-center gap-4 w-full" key="input-token-endpoint-auth-method">
        <label className="block min-w-[140px]">Client Authentication</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <MenuDropdown
            items={METHOD_OPTIONS.map((opt) => ({
              id: opt.id,
              label: opt.label,
              onClick: () => handleChange('tokenEndpointAuthMethod', opt.id)
            }))}
            selectedItemId={method}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end token-placement-label select-none">
              {method}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>

      {usesClientSecret && (
        <div className="flex items-center gap-4 w-full" key="input-client-secret">
          <label className="block min-w-[140px]">Client Secret</label>
          <div className="single-line-editor-wrapper flex-1 flex items-center">
            <SingleLineEditor
              value={clientSecret}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('clientSecret', val)}
              onRun={handleRun}
              collection={collection}
              item={item}
              isSecret
              isCompact
            />
            {clientSecretSensitivity.showWarning && (
              <SensitiveFieldWarning fieldName="clientSecret" warningMessage={clientSecretSensitivity.warningMessage} />
            )}
          </div>
        </div>
      )}

      {isJwt && (
        <div className="flex items-center gap-4 w-full" key="input-signing-alg">
          <label className="block min-w-[140px]">Signing Algorithm</label>
          <div className="inline-flex items-center cursor-pointer token-placement-selector">
            <MenuDropdown
              items={algs.map((alg) => ({
                id: alg,
                label: alg,
                onClick: () => handleChange('tokenEndpointAuthSigningAlg', alg)
              }))}
              selectedItemId={currentAlg}
              placement="bottom-end"
            >
              <div className="flex items-center justify-end token-placement-label select-none">
                {currentAlg}
                <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
              </div>
            </MenuDropdown>
          </div>
        </div>
      )}

      {isPrivateKeyJwt && (
        <>
          <div className="flex items-center gap-4 w-full" key="input-private-key-format">
            <label className="block min-w-[140px]">Key Format</label>
            <div className="inline-flex items-center cursor-pointer token-placement-selector">
              <MenuDropdown
                items={[
                  { id: 'pem', label: 'PEM', onClick: () => handleChange('privateKeyFormat', 'pem') },
                  { id: 'jwk', label: 'JWK', onClick: () => handleChange('privateKeyFormat', 'jwk') }
                ]}
                selectedItemId={privateKeyFormat}
                placement="bottom-end"
              >
                <div className="flex items-center justify-end token-placement-label select-none">
                  {privateKeyFormat.toUpperCase()}
                  <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
                </div>
              </MenuDropdown>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full" key="input-private-key-type">
            <label className="block min-w-[140px]">Key Source</label>
            <div className="inline-flex items-center cursor-pointer token-placement-selector">
              <MenuDropdown
                items={[
                  { id: 'text', label: 'Inline', onClick: () => handleChange('privateKeyType', 'text') },
                  { id: 'file', label: 'File path', onClick: () => handleChange('privateKeyType', 'file') }
                ]}
                selectedItemId={privateKeyType}
                placement="bottom-end"
              >
                <div className="flex items-center justify-end token-placement-label select-none">
                  {privateKeyType === 'file' ? 'File path' : 'Inline'}
                  <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
                </div>
              </MenuDropdown>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full" key="input-private-key">
            <label className="block min-w-[140px]">
              {privateKeyType === 'file' ? 'Private Key Path' : 'Private Key'}
            </label>
            <div className="single-line-editor-wrapper flex-1 flex items-center">
              <SingleLineEditor
                value={privateKey}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('privateKey', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isSecret={privateKeyType === 'text'}
                isCompact
              />
              {privateKeyType === 'text' && sensitivity.showWarning && (
                <SensitiveFieldWarning fieldName="privateKey" warningMessage={sensitivity.warningMessage} />
              )}
            </div>
          </div>
        </>
      )}

      {isJwt && (
        <>
          <div className="flex items-center gap-4 w-full" key="input-key-id">
            <label className="block min-w-[140px]">Key ID</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oAuth.keyId || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('keyId', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full" key="input-audience">
            <label className="block min-w-[140px]">Audience</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oAuth.audience || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('audience', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full" key="input-assertion-lifetime">
            <label className="block min-w-[140px]">Assertion Lifetime (s)</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oAuth.assertionLifetime != null ? String(oAuth.assertionLifetime) : ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => {
                  const parsed = parseInt(val, 10);
                  handleChange('assertionLifetime', Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                }}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ClientAuthMethod;
