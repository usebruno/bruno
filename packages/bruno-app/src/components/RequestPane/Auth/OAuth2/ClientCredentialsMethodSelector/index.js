import React, { forwardRef, useEffect, useRef } from 'react';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import { IconCaretDown } from '@tabler/icons';
import { updateAuth, updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import { humanizeOAuth2ClientSecretMethod } from 'utils/collections';

const ClientCredentialsMethodSelector = ({ item, collection, oAuth }) => {
  const clientSecretMethods = ['client_credentials_basic', 'client_credentials_post'];

  const dispatch = useDispatch();
  const dropDownRef = useRef();
  const onDropdownCreate = (ref) => (dropDownRef.current = ref);

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-end client-credentials-secret-label select-none">
        {humanizeOAuth2ClientSecretMethod(oAuth?.clientSecretMethod)}{' '}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onClientSecretMethodChange = (clientSecretMethod) => {
    if (item) {
      // Update request level authentication
      dispatch(
        updateAuth({
          mode: 'oauth2',
          collectionUid: collection.uid,
          itemUid: item.uid,
          content: {
            ...oAuth,
            clientSecretMethod: clientSecretMethod
          }
        })
      );
    } else {
      // Update collection level authentication
      dispatch(
        updateCollectionAuth({
          mode: 'oauth2',
          collectionUid: collection.uid,
          content: {
            ...oAuth,
            clientSecretMethod: clientSecretMethod
          }
        })
      );
    }
  };

  useEffect(() => {
    !oAuth?.clientSecretMethod && onClientSecretMethodChange(clientSecretMethods[0]);
  }, [oAuth.clientSecretMethod]);

  return (
    <StyledWrapper>
      <label className="block font-medium mb-2">Send Client Credentials</label>
      <div className="inline-flex items-center cursor-pointer client-credentials-secret-mode-selector w-fit">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          {clientSecretMethods.map((item, index) => (
            <div
              key={item}
              className="dropdown-item"
              onClick={() => {
                dropDownRef.current.hide();
                onClientSecretMethodChange(item);
              }}
            >
              {' '}
              {humanizeOAuth2ClientSecretMethod(item)}
              {index === 0 ? ` (Default)` : ``}
            </div>
          ))}
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default ClientCredentialsMethodSelector;
