import React from 'react';
import classnames from 'classnames';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import { updateSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import ProxySettings from './ProxySettings';
import ClientCertSettings from './ClientCertSettings';
import Headers from './Headers';
import Auth from './Auth';
import Script from './Script';
import Test from './Tests';
import Docs from './Docs';
import Presets from './Presets';
import Info from './Info';
import StyledWrapper from './StyledWrapper';
import Vars from './Vars/index';

const CollectionSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const tab = collection.settingsSelectedTab;
  const setTab = (tab) => {
    dispatch(
      updateSettingsSelectedTab({
        collectionUid: collection.uid,
        tab
      })
    );
  };

  const proxyConfig = get(collection, 'brunoConfig.proxy', {});

  const clientCertConfig = get(collection, 'brunoConfig.clientCertificates.certs', []);

  const onProxySettingsUpdate = (config) => {
    const brunoConfig = cloneDeep(collection.brunoConfig);
    brunoConfig.proxy = config;
    dispatch(updateBrunoConfig(brunoConfig, collection.uid))
      .then(() => {
        toast.success('Collection settings updated successfully.');
      })
      .catch((err) => console.log(err) && toast.error('Failed to update collection settings'));
  };

  const onClientCertSettingsUpdate = (config) => {
    const brunoConfig = cloneDeep(collection.brunoConfig);
    if (!brunoConfig.clientCertificates) {
      brunoConfig.clientCertificates = {
        enabled: true,
        certs: [config]
      };
    } else {
      brunoConfig.clientCertificates.certs.push(config);
    }
    dispatch(updateBrunoConfig(brunoConfig, collection.uid))
      .then(() => {
        toast.success('Collection settings updated successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to update collection settings'));
  };

  const onClientCertSettingsRemove = (config) => {
    const brunoConfig = cloneDeep(collection.brunoConfig);
    brunoConfig.clientCertificates.certs = brunoConfig.clientCertificates.certs.filter(
      (item) => item.domain != config.domain
    );
    dispatch(updateBrunoConfig(brunoConfig, collection.uid))
      .then(() => {
        toast.success('Collection settings updated successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to update collection settings'));
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'headers': {
        return <Headers collection={collection} />;
      }
      case 'vars': {
        return <Vars collection={collection} />;
      }
      case 'auth': {
        return <Auth collection={collection} />;
      }
      case 'script': {
        return <Script collection={collection} />;
      }
      case 'tests': {
        return <Test collection={collection} />;
      }
      case 'presets': {
        return <Presets collection={collection} />;
      }
      case 'proxy': {
        return <ProxySettings proxyConfig={proxyConfig} onUpdate={onProxySettingsUpdate} />;
      }
      case 'clientCert': {
        return (
          <ClientCertSettings
            root={collection.pathname}
            clientCertConfig={clientCertConfig}
            onUpdate={onClientCertSettingsUpdate}
            onRemove={onClientCertSettingsRemove}
          />
        );
      }
      case 'docs': {
        return <Docs collection={collection} />;
      }
      case 'info': {
        return <Info collection={collection} />;
      }
    }
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === tab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative px-4 py-4">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('headers')} role="tab" onClick={() => setTab('headers')}>
          Headers
        </div>
        <div className={getTabClassname('vars')} role="tab" onClick={() => setTab('vars')}>
          Vars
        </div>
        <div className={getTabClassname('auth')} role="tab" onClick={() => setTab('auth')}>
          Auth
        </div>
        <div className={getTabClassname('script')} role="tab" onClick={() => setTab('script')}>
          Script
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => setTab('tests')}>
          Tests
        </div>
        <div className={getTabClassname('presets')} role="tab" onClick={() => setTab('presets')}>
          Presets
        </div>
        <div className={getTabClassname('proxy')} role="tab" onClick={() => setTab('proxy')}>
          Proxy
        </div>
        <div className={getTabClassname('clientCert')} role="tab" onClick={() => setTab('clientCert')}>
          Client Certificates
        </div>
        <div className={getTabClassname('docs')} role="tab" onClick={() => setTab('docs')}>
          Docs
        </div>
        <div className={getTabClassname('info')} role="tab" onClick={() => setTab('info')}>
          Info
        </div>
      </div>
      <section className="mt-4 h-full">{getTabPanel(tab)}</section>
    </StyledWrapper>
  );
};

export default CollectionSettings;
