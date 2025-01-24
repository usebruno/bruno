import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { IconCaretDown, IconKey } from '@tabler/icons';
import { humanizeGrantType } from 'utils/collections';
import { useEffect } from 'react';

const GrantTypeSelector = ({ item = {}, request, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const oAuth = get(request, 'auth.oauth2', {});

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-end grant-type-label select-none">
        {humanizeGrantType(oAuth?.grantType)} <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onGrantTypeChange = (grantType) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...(defaultValues?.[grantType] || {})
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
            tokenPrefix: 'Bearer',
            tokenQueryKey: 'access_token',
            reuseToken: false
          }
        })
      );
  }, [oAuth]);

  return (
    <StyledWrapper>
      <div className="flex items-center gap-2.5 my-4">
        <div className="flex items-center px-2.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-md">
          <IconKey size={14} className="text-indigo-500 dark:text-indigo-400" />
        </div>
        <span className="text-sm font-medium">
          Grant Type
        </span>
      </div>
      <div className="inline-flex items-center cursor-pointer grant-type-mode-selector w-fit">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
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
              onGrantTypeChange('authorization_code');
            }}
          >
            Authorization Code
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
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default GrantTypeSelector;

const defaultValues = {
  'authorization_code': {
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
    tokenPrefix: 'Bearer',
    tokenQueryKey: 'access_token',
    reuseToken: false
  },
  'client_credentials': {
    grantType: 'client_credentials',
    accessTokenUrl: '',
    clientId: '',
    clientSecret: '',
    scope: '',
    credentialsPlacement: 'body',
    credentialsId: 'credentials',
    tokenPlacement: 'header',
    tokenPrefix: 'Bearer',
    tokenQueryKey: 'access_token',
    reuseToken: false
  },
  'password': {
    grantType: 'password',
    accessTokenUrl: '',
    username: '',
    password: '',
    clientId: '',
    clientSecret: '',
    scope: '',
    credentialsPlacement: 'body',
    credentialsId: 'credentials',
    tokenPlacement: 'header',
    tokenPrefix: 'Bearer',
    tokenQueryKey: 'access_token',
    reuseToken: false
  }
}