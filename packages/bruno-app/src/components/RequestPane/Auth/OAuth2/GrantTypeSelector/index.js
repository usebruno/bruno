import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { IconCaretDown, IconKey } from '@tabler/icons';
import { humanizeGrantType } from 'utils/collections';
import { useEffect } from 'react';
import { useState } from 'react';

const GrantTypeSelector = ({ item = {}, request, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const oAuth = get(request, 'auth.oauth2', {});
  const [valuesCache, setValuesCache] = useState({
    ...oAuth
  });
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="select-button">
        <span className="select-label">{humanizeGrantType(oAuth?.grantType)}</span>
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onGrantTypeChange = (grantType) => {
    let updatedValues = {
      ...valuesCache,
      ...oAuth,
      grantType
    };
    setValuesCache(updatedValues);
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...updatedValues
        }
      })
    );
  };

  useEffect(() => {
    // initialize redux state with a default oauth2 grant type
    // authorization_code - default option
    !oAuth?.grantType &&
      dispatch(
        updateAuth({
          mode: 'oauth2',
          collectionUid: collection.uid,
          itemUid: item.uid,
          content: {
            grantType: 'authorization_code',
            accessTokenUrl: '',
            username: '',
            password: '',
            clientId: '',
            clientSecret: '',
            scope: '',
            credentialsPlacement: 'body',
            credentialsId: 'credentials',
            tokenPlacement: 'header',
            tokenHeaderPrefix: 'Bearer',
            tokenQueryKey: 'access_token',
          }
        })
      );
  }, [oAuth]);

  return (
    <StyledWrapper className="oauth-section">
      <div className="section-header">
        <div className="section-icon">
          <IconKey size={16} strokeWidth={2} />
        </div>
        <h3 className="section-title">Grant Type</h3>
      </div>

      <div className="form-field">
        <label className="form-label">OAuth 2.0 Flow</label>
        <div className="help-text">
          Select the OAuth 2.0 grant type that matches your authorization server configuration
        </div>
        <div className="select-wrapper">
          <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
            <div
              className="dropdown-item"
              onClick={() => {
                dropdownTippyRef.current.hide();
                onGrantTypeChange('authorization_code');
              }}
            >
              Authorization Code
            </div>
            <div
              className="dropdown-item"
              onClick={() => {
                dropdownTippyRef.current.hide();
                onGrantTypeChange('password');
              }}
            >
              Password Credentials
            </div>
            <div
              className="dropdown-item"
              onClick={() => {
                dropdownTippyRef.current.hide();
                onGrantTypeChange('client_credentials');
              }}
            >
              Client Credentials
            </div>
            <div
              className="dropdown-item"
              onClick={() => {
                dropdownTippyRef.current.hide();
                onGrantTypeChange('implicit');
              }}
            >
              Implicit
            </div>
          </Dropdown>
        </div>
      </div>
    </StyledWrapper>
  );
};
export default GrantTypeSelector;