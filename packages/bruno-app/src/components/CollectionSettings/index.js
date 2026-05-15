import React from 'react';
import classnames from 'classnames';
import get from 'lodash/get';
import { updateSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import ProxySettings from './ProxySettings';
import ClientCertSettings from './ClientCertSettings';
import Headers from './Headers';
import Auth from './Auth';
import Script from './Script';
import Test from './Tests';
import Presets from './Presets';
import Protobuf from './Protobuf';
import StyledWrapper from './StyledWrapper';
import Vars from './Vars/index';
import StatusDot from 'components/StatusDot';
import Overview from './Overview/index';
import { useTranslation } from 'react-i18next';

const CollectionSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const tab = collection.settingsSelectedTab;
  const setTab = (tab) => {
    dispatch(
      updateSettingsSelectedTab({
        collectionUid: collection.uid,
        tab
      })
    );
  };

  const root = collection?.draft?.root || collection?.root;
  const hasScripts = root?.request?.script?.res || root?.request?.script?.req;
  const hasTests = root?.request?.tests;
  const hasDocs = root?.docs;

  const headers = collection.draft?.root
    ? get(collection, 'draft.root.request.headers', [])
    : get(collection, 'root.request.headers', []);
  const activeHeadersCount = headers.filter((header) => header.enabled).length;

  const requestVars = collection.draft?.root
    ? get(collection, 'draft.root.request.vars.req', [])
    : get(collection, 'root.request.vars.req', []);
  const responseVars = collection.draft?.root
    ? get(collection, 'draft.root.request.vars.res', [])
    : get(collection, 'root.request.vars.res', []);
  const activeVarsCount = requestVars.filter((v) => v.enabled).length + responseVars.filter((v) => v.enabled).length;
  const authMode
    = (collection.draft?.root ? get(collection, 'draft.root.request.auth', {}) : get(collection, 'root.request.auth', {}))
      .mode || 'none';

  const proxyConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.proxy', {})
    : get(collection, 'brunoConfig.proxy', {});
  const proxyEnabled = proxyConfig.hostname ? true : false;
  const clientCertConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.clientCertificates.certs', [])
    : get(collection, 'brunoConfig.clientCertificates.certs', []);
  const protobufConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.protobuf', {})
    : get(collection, 'brunoConfig.protobuf', {});
  const presets = collection.draft?.brunoConfig ? get(collection, 'draft.brunoConfig.presets', {}) : get(collection, 'brunoConfig.presets', {});
  const hasPresets = presets && presets.requestUrl !== '';

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'overview': {
        return <Overview collection={collection} />;
      }
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
        return <ProxySettings collection={collection} />;
      }
      case 'clientCert': {
        return <ClientCertSettings collection={collection} />;
      }
      case 'protobuf': {
        return <Protobuf collection={collection} />;
      }
    }
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === tab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative px-4 py-4 overflow-hidden">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('overview')} role="tab" data-testid="collection-settings-tab-overview" onClick={() => setTab('overview')}>
          {t('COLLECTION_SETTINGS.OVERVIEW')}
        </div>
        <div className={getTabClassname('headers')} role="tab" data-testid="collection-settings-tab-headers" onClick={() => setTab('headers')}>
          {t('COLLECTION_SETTINGS.HEADERS')}
          {activeHeadersCount > 0 && <sup className="ml-1 font-medium">{activeHeadersCount}</sup>}
        </div>
        <div className={getTabClassname('vars')} role="tab" data-testid="collection-settings-tab-vars" onClick={() => setTab('vars')}>
          {t('COLLECTION_SETTINGS.VARS')}
          {activeVarsCount > 0 && <sup className="ml-1 font-medium">{activeVarsCount}</sup>}
        </div>
        <div className={getTabClassname('auth')} role="tab" data-testid="collection-settings-tab-auth" onClick={() => setTab('auth')}>
          {t('COLLECTION_SETTINGS.AUTH')}
          {authMode !== 'none' && <StatusDot />}
        </div>
        <div className={getTabClassname('script')} role="tab" data-testid="collection-settings-tab-script" onClick={() => setTab('script')}>
          {t('COLLECTION_SETTINGS.SCRIPT')}
          {hasScripts && <StatusDot />}
        </div>
        <div className={getTabClassname('tests')} role="tab" data-testid="collection-settings-tab-tests" onClick={() => setTab('tests')}>
          {t('COLLECTION_SETTINGS.TESTS')}
          {hasTests && <StatusDot />}
        </div>
        <div className={getTabClassname('presets')} role="tab" data-testid="collection-settings-tab-presets" onClick={() => setTab('presets')}>
          {t('COLLECTION_SETTINGS.PRESETS')}
          {hasPresets && <StatusDot />}
        </div>
        <div className={getTabClassname('proxy')} role="tab" data-testid="collection-settings-tab-proxy" onClick={() => setTab('proxy')}>
          {t('COLLECTION_SETTINGS.PROXY')}
          {Object.keys(proxyConfig).length > 0 && proxyEnabled && <StatusDot />}
        </div>
        <div className={getTabClassname('clientCert')} role="tab" data-testid="collection-settings-tab-clientCert" onClick={() => setTab('clientCert')}>
          {t('COLLECTION_SETTINGS.CLIENT_CERTIFICATES')}
          {clientCertConfig.length > 0 && <StatusDot />}
        </div>
        <div className={getTabClassname('protobuf')} role="tab" data-testid="collection-settings-tab-protobuf" onClick={() => setTab('protobuf')}>
          {t('COLLECTION_SETTINGS.PROTOBUF')}
          {protobufConfig.protoFiles && protobufConfig.protoFiles.length > 0 && <StatusDot />}
        </div>
      </div>
      <section className="collection-settings-content mt-4 h-full overflow-auto">{getTabPanel(tab)}</section>
    </StyledWrapper>
  );
};

export default CollectionSettings;
