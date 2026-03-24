import React, { useState } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import path from 'utils/common/path';
import { IconSettings, IconShieldLock, IconAdjustmentsHorizontal, IconCaretDown, IconChevronRight, IconFile, IconX, IconUpload } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import SingleLineEditor from 'components/SingleLineEditor';
import MultiLineEditor from 'components/MultiLineEditor';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import toast from 'react-hot-toast';
import { sendRequest, browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const signatureMethodLabels = {
  'HMAC-SHA1': 'HMAC-SHA1',
  'HMAC-SHA256': 'HMAC-SHA256',
  'HMAC-SHA512': 'HMAC-SHA512',
  'RSA-SHA1': 'RSA-SHA1',
  'RSA-SHA256': 'RSA-SHA256',
  'RSA-SHA512': 'RSA-SHA512',
  'PLAINTEXT': 'PLAINTEXT'
};

const addParamsToLabels = {
  header: 'Header',
  query: 'Query Params',
  body: 'Body'
};

const OAuth1 = ({ item = {}, collection, request, save, updateAuth }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const oauth1 = get(request, 'auth.oauth1', {});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { isSensitive } = useDetectSensitiveField(collection);
  const consumerSecretSensitive = isSensitive(oauth1.consumerSecret);
  const tokenSecretSensitive = isSensitive(oauth1.accessTokenSecret);
  const privateKeySensitive = isSensitive(oauth1.privateKey);

  const handleRun = item?.uid ? () => dispatch(sendRequest(item, collection.uid)) : undefined;
  const handleSave = () => save();

  const handleChange = (field, value) => {
    dispatch(
      updateAuth({
        mode: 'oauth1',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...oauth1,
          [field]: value
        }
      })
    );
  };

  const handlePrivateKeyChange = (val) => {
    if (val && /^@file\(/.test(val.trim())) {
      toast.error('File references should be added using the "Upload File" button below');
      return;
    }
    handleChange('privateKey', val);
  };

  const handleBrowse = () => {
    dispatch(browseFiles([], []))
      .then((filePaths) => {
        if (filePaths && filePaths.length > 0) {
          let filePath = filePaths[0];
          const collectionDir = collection.pathname;
          filePath = path.relative(collectionDir, filePath);
          dispatch(
            updateAuth({
              mode: 'oauth1',
              collectionUid: collection.uid,
              itemUid: item.uid,
              content: {
                ...oauth1,
                privateKey: filePath,
                privateKeyType: 'file'
              }
            })
          );
        }
      })
      .catch((error) => console.error(error));
  };

  const handleClearFile = () => {
    dispatch(
      updateAuth({
        mode: 'oauth1',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...oauth1,
          privateKey: '',
          privateKeyType: 'text'
        }
      })
    );
  };

  const privateKeyValue = oauth1.privateKey || '';
  const isFileRef = oauth1.privateKeyType === 'file';
  const fileName = isFileRef ? path.basename(privateKeyValue) : '';

  return (
    <StyledWrapper className="mt-2 flex w-full gap-4 flex-col">
      {/* Configuration Section */}
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth1-icon-container rounded-md">
          <IconSettings size={14} className="oauth1-icon" />
        </div>
        <span className="oauth1-section-label">
          Configuration
        </span>
      </div>

      <div className="flex items-center gap-4 w-full">
        <label className="block min-w-[140px]">Consumer Key</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={oauth1.consumerKey || ''}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('consumerKey', val)}
            onRun={handleRun}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>

      {!oauth1.signatureEncoding?.startsWith('RSA-') && (
        <div className="flex items-center gap-4 w-full">
          <label className="block min-w-[140px]">Consumer Secret</label>
          <div className="single-line-editor-wrapper flex-1 flex items-center">
            <SingleLineEditor
              value={oauth1.consumerSecret || ''}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('consumerSecret', val)}
              onRun={handleRun}
              collection={collection}
              item={item}
              isSecret={true}
              isCompact
            />
            {consumerSecretSensitive.showWarning && <SensitiveFieldWarning fieldName="oauth1-consumer-secret" warningMessage={consumerSecretSensitive.warningMessage} />}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 w-full">
        <label className="block min-w-[140px]">Token</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={oauth1.accessToken || ''}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('accessToken', val)}
            onRun={handleRun}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>

      <div className="flex items-center gap-4 w-full">
        <label className="block min-w-[140px]">Token Secret</label>
        <div className="single-line-editor-wrapper flex-1 flex items-center">
          <SingleLineEditor
            value={oauth1.accessTokenSecret || ''}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('accessTokenSecret', val)}
            onRun={handleRun}
            collection={collection}
            item={item}
            isSecret={true}
            isCompact
          />
          {tokenSecretSensitive.showWarning && <SensitiveFieldWarning fieldName="oauth1-token-secret" warningMessage={tokenSecretSensitive.warningMessage} />}
        </div>
      </div>

      {/* Signature Section */}
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth1-icon-container rounded-md">
          <IconShieldLock size={14} className="oauth1-icon" />
        </div>
        <span className="oauth1-section-label">
          Signature
        </span>
      </div>

      <div className="flex items-center gap-4 w-full">
        <label className="block min-w-[140px]">Signature Method</label>
        <div className="inline-flex items-center cursor-pointer oauth1-dropdown-selector">
          <MenuDropdown
            items={Object.entries(signatureMethodLabels).map(([value, label]) => ({
              id: value,
              label,
              onClick: () => handleChange('signatureEncoding', value)
            }))}
            selectedItemId={oauth1.signatureEncoding}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end oauth1-dropdown-label select-none">
              {signatureMethodLabels[oauth1.signatureEncoding] || 'HMAC-SHA1'}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>

      {oauth1.signatureEncoding?.startsWith('RSA-') && (
        <div className="flex items-start gap-4 w-full">
          <label className="block min-w-[140px] mt-1">Private Key</label>
          {isFileRef ? (
            <div className="private-key-editor-wrapper flex-1 flex items-center gap-2">
              <IconFile size={16} className="oauth1-icon flex-shrink-0" />
              <span className="truncate flex-1" title={privateKeyValue}>{fileName}</span>
              <button
                className="flex-shrink-0 oauth1-icon cursor-pointer"
                onClick={handleClearFile}
                title="Clear file"
                type="button"
              >
                <IconX size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-2">
              <div className="private-key-editor-wrapper flex-1 flex items-center">
                <MultiLineEditor
                  value={privateKeyValue}
                  theme={storedTheme}
                  onSave={handleSave}
                  onChange={handlePrivateKeyChange}
                  onRun={handleRun}
                  collection={collection}
                  item={item}
                  isSecret={true}
                  allowNewlines={true}
                />
                {privateKeySensitive.showWarning && <SensitiveFieldWarning fieldName="oauth1-private-key" warningMessage={privateKeySensitive.warningMessage} />}
              </div>
              <div className="flex flex-row gap-2">
                <button
                  className="flex items-center gap-1 oauth1-icon cursor-pointer text-link"
                  onClick={handleBrowse}
                  title="Select file"
                  type="button"
                >
                  <IconUpload size={14} />
                  <span className="text-xs">Upload File</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 w-full">
        <label className="block min-w-[140px]">Add Params To</label>
        <div className="inline-flex items-center cursor-pointer oauth1-dropdown-selector">
          <MenuDropdown
            items={Object.entries(addParamsToLabels).map(([value, label]) => ({
              id: value,
              label,
              onClick: () => handleChange('addParamsTo', value)
            }))}
            selectedItemId={oauth1.addParamsTo}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end oauth1-dropdown-label select-none">
              {addParamsToLabels[oauth1.addParamsTo] || 'Header'}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>

      {oauth1.addParamsTo === 'body' && (
        <div className="flex items-center gap-4 w-full">
          <label className="block min-w-[140px]"></label>
          <span className="text-xs opacity-60">
            Body placement requires a form-urlencoded body. Non-form payloads will be replaced with OAuth parameters.
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 w-full">
        <label className="block min-w-[140px]"></label>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={oauth1.includeBodyHash || false}
            onChange={(e) => handleChange('includeBodyHash', e.target.checked)}
          />
          <label
            className="block cursor-pointer"
            onClick={(e) => {
              e.preventDefault(); handleChange('includeBodyHash', !oauth1.includeBodyHash);
            }}
          >
            Include Body Hash
          </label>
        </div>
      </div>

      {/* Advanced Section (collapsible) */}
      <div
        className="flex items-center gap-2.5 mt-2 cursor-pointer select-none"
        onClick={() => setAdvancedOpen(!advancedOpen)}
      >
        <div className="flex items-center px-2.5 py-1.5 oauth1-icon-container rounded-md">
          <IconAdjustmentsHorizontal size={14} className="oauth1-icon" />
        </div>
        <span className="oauth1-section-label">
          Advanced
        </span>
        <IconChevronRight
          size={14}
          className={`oauth1-icon transition-transform ${advancedOpen ? 'rotate-90' : ''}`}
        />
      </div>

      {advancedOpen && (
        <>
          <div className="flex items-center gap-4 w-full">
            <label className="block min-w-[140px]">Callback URL</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oauth1.callbackUrl || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('callbackUrl', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full">
            <label className="block min-w-[140px]">Verifier</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oauth1.verifier || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('verifier', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full">
            <label className="block min-w-[140px]">Timestamp</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oauth1.timestamp || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('timestamp', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full">
            <label className="block min-w-[140px]">Nonce</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oauth1.nonce || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('nonce', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full">
            <label className="block min-w-[140px]">Version</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oauth1.version || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('version', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full">
            <label className="block min-w-[140px]">Realm</label>
            <div className="single-line-editor-wrapper flex-1">
              <SingleLineEditor
                value={oauth1.realm || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('realm', val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isCompact
              />
            </div>
          </div>
        </>
      )}
    </StyledWrapper>
  );
};

export default OAuth1;
