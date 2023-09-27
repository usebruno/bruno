import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import ProxySettings from './ProxySettings';
import StyledWrapper from './StyledWrapper';

const CollectionSettings = ({ collection }) => {
  const dispatch = useDispatch();

  const proxyConfig = get(collection, 'brunoConfig.proxy', {});

  const onProxySettingsUpdate = (config) => {
    const brunoConfig = cloneDeep(collection.brunoConfig);
    brunoConfig.proxy = config;
    dispatch(updateBrunoConfig(brunoConfig, collection.uid))
      .then(() => {
        toast.success('Collection settings updated successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to update collection settings'));
  };

  return (
    <StyledWrapper className="px-4 py-4">
      <h1 className="font-semibold mb-4">Collection Settings</h1>

      <ProxySettings proxyConfig={proxyConfig} onUpdate={onProxySettingsUpdate} />
    </StyledWrapper>
  );
};

export default CollectionSettings;
