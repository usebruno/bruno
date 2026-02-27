import React from 'react';
import get from 'lodash/get';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { IconCaretDown, IconKey } from '@tabler/icons';
import { humanizeGrantType } from 'utils/collections';
import { useEffect } from 'react';
import { useState } from 'react';

const GrantTypeSelector = ({ item = {}, request, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const oAuth = get(request, 'auth.oauth2', {});
  const [valuesCache, setValuesCache] = useState({
    ...oAuth
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
    !oAuth?.grantType
    && dispatch(
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
          tokenSource: 'access_token'
        }
      })
    );
  }, [oAuth]);

  return (
    <StyledWrapper>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconKey size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">
          Grant Type
        </span>
      </div>
      <div className="inline-flex items-center cursor-pointer grant-type-mode-selector w-fit">
        <MenuDropdown
          items={[
            { id: 'password', label: 'Password Credentials', onClick: () => onGrantTypeChange('password') },
            { id: 'authorization_code', label: 'Authorization Code', onClick: () => onGrantTypeChange('authorization_code') },
            { id: 'implicit', label: 'Implicit', onClick: () => onGrantTypeChange('implicit') },
            { id: 'client_credentials', label: 'Client Credentials', onClick: () => onGrantTypeChange('client_credentials') }
          ]}
          selectedItemId={oAuth?.grantType}
          placement="bottom-end"
        >
          <div className="flex items-center justify-end grant-type-label select-none">
            {humanizeGrantType(oAuth?.grantType)} <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};
export default GrantTypeSelector;
