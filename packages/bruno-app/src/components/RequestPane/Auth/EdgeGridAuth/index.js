import React from 'react';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const EdgeGridAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const edgeGridAuth = get(request, 'auth.edgegrid', {});
  const { isSensitive } = useDetectSensitiveField(collection);
  const { showWarning: showClientSecretWarning, warningMessage: clientSecretWarningMessage } = isSensitive(edgeGridAuth?.client_secret);

  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleSave = () => {
    save();
  };

  const handleFieldChange = (field, value) => {
    dispatch(updateAuth({
      mode: 'edgegrid',
      collectionUid: collection.uid,
      itemUid: item.uid,
      content: {
        access_token: edgeGridAuth.access_token || '',
        client_token: edgeGridAuth.client_token || '',
        client_secret: edgeGridAuth.client_secret || '',
        nonce: edgeGridAuth.nonce || '',
        timestamp: edgeGridAuth.timestamp || '',
        base_url: edgeGridAuth.base_url || '',
        headers_to_sign: edgeGridAuth.headers_to_sign || '',
        max_body_size: edgeGridAuth.max_body_size || '',
        [field]: value || ''
      }
    }));
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Access Token</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={edgeGridAuth.access_token || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleFieldChange('access_token', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Client Token</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={edgeGridAuth.client_token || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleFieldChange('client_token', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Client Secret</label>
      <div className="single-line-editor-wrapper mb-2 flex items-center">
        <SingleLineEditor
          value={edgeGridAuth.client_secret || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleFieldChange('client_secret', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isSecret={true}
        />
        {showClientSecretWarning && <SensitiveFieldWarning fieldName="edgegrid-client-secret" warningMessage={clientSecretWarningMessage} />}
      </div>

      <label className="block font-medium mb-2">Base URL</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={edgeGridAuth.base_url || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleFieldChange('base_url', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">
        Nonce
        <span className="text-xs text-gray-500 ml-2">(optional, auto-generated if empty)</span>
      </label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={edgeGridAuth.nonce || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleFieldChange('nonce', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">
        Timestamp
        <span className="text-xs text-gray-500 ml-2">(optional, auto-generated if empty)</span>
      </label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={edgeGridAuth.timestamp || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleFieldChange('timestamp', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">
        Headers to Sign
        <span className="text-xs text-gray-500 ml-2">(optional, comma-separated)</span>
      </label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={edgeGridAuth.headers_to_sign || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleFieldChange('headers_to_sign', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">
        Max Body Size
        <span className="text-xs text-gray-500 ml-2">(optional, in bytes, default: 131072)</span>
      </label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor
          value={edgeGridAuth.max_body_size || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleFieldChange('max_body_size', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>
    </StyledWrapper>
  );
};

export default EdgeGridAuth;
