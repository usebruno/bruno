import classnames from 'classnames';
import { cloneDeep, get, omit } from 'lodash';
import { updateSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import React from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { hasNonEmptyValue } from 'src/utils/common';
import Auth from './Auth';
import ClientCertSettings from './ClientCertSettings';
import Docs from './Docs';
import Headers from './Headers';
import Info from './Info';
import Presets from './Presets';
import ProxySettings from './ProxySettings';
import Script from './Script';
import StyledWrapper from './StyledWrapper';
import Test from './Tests';

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

  const getTabClassname = (tabName, hasContent) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === tab,
      content: hasContent
    });
  };

  const root = collection.root || {};
  const activeHeadersLength = root.request.headers.filter((header) => header.enabled).length;

  return (
    <StyledWrapper className="flex flex-col h-full relative px-4 py-4">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('headers', root.request.headers.length)} role="tab" onClick={() => setTab('headers')}>
          Headers
          {activeHeadersLength > 0 && <sup className="ml-1 font-medium">{activeHeadersLength}</sup>}
        </div>
        <div className={getTabClassname('auth', hasNonEmptyValue(omit(root.request.auth, 'mode')))} role="tab" onClick={() => setTab('auth')}>
          Auth
        </div>
        <div className={getTabClassname('script', root.request.script.req || root.request.script.res)} role="tab" onClick={() => setTab('script')}>
          Script
        </div>
        <div className={getTabClassname('tests', root.request.tests.length)} role="tab" onClick={() => setTab('tests')}>
          Tests
        </div>
        <div className={getTabClassname('presets', hasNonEmptyValue(omit(collection.brunoConfig.presets, 'requestType')))} role="tab" onClick={() => setTab('presets')}>
          Presets
        </div>
        <div className={getTabClassname('proxy', proxyConfig.enabled)} role="tab" onClick={() => setTab('proxy')}>
          Proxy
        </div>
        <div className={getTabClassname('clientCert', clientCertConfig.length)} role="tab" onClick={() => setTab('clientCert')}>
          Client Certificates
        </div>
        <div className={getTabClassname('docs', root.docs.length)} role="tab" onClick={() => setTab('docs')}>
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

