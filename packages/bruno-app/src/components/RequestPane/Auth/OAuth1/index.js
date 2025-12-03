import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { IconCaretDown } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Dropdown from 'components/Dropdown';

const OAuth1 = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const signatureMethodDropdownRef = useRef();
  const paramTransmissionDropdownRef = useRef();

  let request = item.draft ? get(item, 'draft.request', {}) : get(item, 'request', {});
  const oAuth1 = get(request, 'auth.oauth1', {});

  const {
    consumerKey,
    consumerSecret,
    signatureMethod = 'HMAC-SHA1',
    parameterTransmission = 'authorization_header',
    requestTokenUrl,
    authorizeUrl,
    accessTokenUrl,
    callbackUrl,
    accessToken,
    accessTokenSecret,
    rsaPrivateKey,
    credentialsId = 'credentials'
  } = oAuth1;

  const handleSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const SignatureMethodIcon = forwardRef((props, ref) => {
    const methodLabels = {
      'HMAC-SHA1': 'HMAC-SHA1',
      'HMAC-SHA256': 'HMAC-SHA256',
      'HMAC-SHA512': 'HMAC-SHA512',
      'RSA-SHA1': 'RSA-SHA1',
      'RSA-SHA256': 'RSA-SHA256',
      'RSA-SHA512': 'RSA-SHA512',
      'PLAINTEXT': 'PLAINTEXT'
    };
    return (
      <div ref={ref} className="flex items-center justify-end select-none">
        {methodLabels[signatureMethod] || 'HMAC-SHA1'}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const ParameterTransmissionIcon = forwardRef((props, ref) => {
    const transmissionLabels = {
      authorization_header: 'Authorization Header',
      request_body: 'Request Body',
      query_param: 'Query Parameters'
    };
    return (
      <div ref={ref} className="flex items-center justify-end select-none">
        {transmissionLabels[parameterTransmission] || 'Authorization Header'}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const handleChange = (key, value) => {
    dispatch(updateAuth({
      mode: 'oauth1',
      collectionUid: collection.uid,
      itemUid: item.uid,
      content: {
        consumerKey,
        consumerSecret,
        signatureMethod,
        parameterTransmission,
        requestTokenUrl,
        authorizeUrl,
        accessTokenUrl,
        callbackUrl,
        accessToken,
        accessTokenSecret,
        rsaPrivateKey,
        credentialsId,
        [key]: value
      }
    }));
  };

  return (
    <StyledWrapper className="mt-2 w-full">
      <div className="flex flex-col gap-4">
        {/* Consumer Credentials */}
        <div>
          <label htmlFor="consumer-key" className="block mb-1">
            Consumer Key
          </label>
          <div className="single-line-editor-wrapper">
            <SingleLineEditor
              id="consumer-key"
              value={consumerKey || ''}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('consumerKey', val)}
              collection={collection}
            />
          </div>
        </div>

        <div>
          <label htmlFor="consumer-secret" className="block mb-1">
            Consumer Secret
          </label>
          <div className="single-line-editor-wrapper is-secret">
            <SingleLineEditor
              id="consumer-secret"
              value={consumerSecret || ''}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('consumerSecret', val)}
              collection={collection}
            />
          </div>
        </div>

        {/* Signature Method */}
        <div className="signature-method-selector">
          <label>Signature Method</label>
          <Dropdown
            icon={<SignatureMethodIcon />}
            onCreate={(ref) => signatureMethodDropdownRef.current = ref}
            placement="bottom-end"
          >
            <div className="dropdown-item" onClick={() => handleChange('signatureMethod', 'HMAC-SHA1')}>
              HMAC-SHA1
            </div>
            <div className="dropdown-item" onClick={() => handleChange('signatureMethod', 'HMAC-SHA256')}>
              HMAC-SHA256
            </div>
            <div className="dropdown-item" onClick={() => handleChange('signatureMethod', 'HMAC-SHA512')}>
              HMAC-SHA512
            </div>
            <div className="dropdown-item" onClick={() => handleChange('signatureMethod', 'RSA-SHA1')}>
              RSA-SHA1
            </div>
            <div className="dropdown-item" onClick={() => handleChange('signatureMethod', 'RSA-SHA256')}>
              RSA-SHA256
            </div>
            <div className="dropdown-item" onClick={() => handleChange('signatureMethod', 'RSA-SHA512')}>
              RSA-SHA512
            </div>
            <div className="dropdown-item" onClick={() => handleChange('signatureMethod', 'PLAINTEXT')}>
              PLAINTEXT
            </div>
          </Dropdown>
        </div>

        {/* RSA Private Key (only shown for RSA signature methods) */}
        {signatureMethod && signatureMethod.startsWith('RSA-') && (
          <div>
            <label htmlFor="rsa-private-key" className="block mb-1">
              RSA Private Key
            </label>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                id="rsa-private-key"
                value={rsaPrivateKey || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('rsaPrivateKey', val)}
                collection={collection}
              />
            </div>
            <div className="help-text">
              Enter the RSA private key in PEM format for RSA-based signature methods
            </div>
          </div>
        )}

        {/* Parameter Transmission */}
        <div className="parameter-transmission-selector">
          <label>Parameter Transmission</label>
          <Dropdown
            icon={<ParameterTransmissionIcon />}
            onCreate={(ref) => paramTransmissionDropdownRef.current = ref}
            placement="bottom-end"
          >
            <div className="dropdown-item" onClick={() => handleChange('parameterTransmission', 'authorization_header')}>
              Authorization Header
            </div>
            <div className="dropdown-item" onClick={() => handleChange('parameterTransmission', 'request_body')}>
              Request Body
            </div>
            <div className="dropdown-item" onClick={() => handleChange('parameterTransmission', 'query_param')}>
              Query Parameters
            </div>
          </Dropdown>
        </div>

        {/* Access Token & Secret (Manual Input) */}
        <div>
          <label htmlFor="access-token" className="block mb-1">
            Access Token
          </label>
          <div className="single-line-editor-wrapper">
            <SingleLineEditor
              id="access-token"
              value={accessToken || ''}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('accessToken', val)}
              collection={collection}
            />
          </div>
          <div className="help-text">
            Enter your OAuth 1.0 access token manually, or leave empty if using 3-legged flow
          </div>
        </div>

        <div>
          <label htmlFor="access-token-secret" className="block mb-1">
            Access Token Secret
          </label>
          <div className="single-line-editor-wrapper is-secret">
            <SingleLineEditor
              id="access-token-secret"
              value={accessTokenSecret || ''}
              theme={storedTheme}
              onSave={handleSave}
              onChange={(val) => handleChange('accessTokenSecret', val)}
              collection={collection}
            />
          </div>
        </div>

        {/* 3-Legged Flow URLs (Optional) */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">3-Legged OAuth Flow (Optional)</h3>
          <div className="help-text mb-3">
            If you need to obtain new tokens, provide the URLs below and use the "Get Access Token" button
          </div>

          <div className="mb-3">
            <label htmlFor="request-token-url" className="block mb-1">
              Request Token URL
            </label>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                id="request-token-url"
                value={requestTokenUrl || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('requestTokenUrl', val)}
                collection={collection}
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="authorize-url" className="block mb-1">
              Authorize URL
            </label>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                id="authorize-url"
                value={authorizeUrl || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('authorizeUrl', val)}
                collection={collection}
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="access-token-url" className="block mb-1">
              Access Token URL
            </label>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                id="access-token-url"
                value={accessTokenUrl || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('accessTokenUrl', val)}
                collection={collection}
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="callback-url" className="block mb-1">
              Callback URL
            </label>
            <div className="single-line-editor-wrapper">
              <SingleLineEditor
                id="callback-url"
                value={callbackUrl || ''}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange('callbackUrl', val)}
                collection={collection}
              />
            </div>
            <div className="help-text">
              The callback URL registered with your OAuth provider (e.g., http://localhost:8080/callback)
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default OAuth1;
