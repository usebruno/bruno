import React from 'react';
import classnames from 'classnames';
import { updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import Headers from './Headers';
import Script from './Script';
import Tests from './Tests';
import StyledWrapper from './StyledWrapper';
import Vars from './Vars';
import Documentation from './Documentation';
import DotIcon from 'components/Icons/Dot';

const ContentIndicator = () => {
  return (
    <sup className="ml-[.125rem] opacity-80 font-medium">
      <DotIcon width="10"></DotIcon>
    </sup>
  );
};

const FolderSettings = ({ collection, folder }) => {
  const dispatch = useDispatch();
  let tab = 'headers';
  const { folderLevelSettingsSelectedTab } = collection;
  if (folderLevelSettingsSelectedTab?.[folder?.uid]) {
    tab = folderLevelSettingsSelectedTab[folder?.uid];
  }

  const folderRoot = collection?.items.find((item) => item.uid === folder?.uid)?.root;
  const hasScripts = folderRoot?.request?.script?.res || folderRoot?.request?.script?.req;
  const hasTests = folderRoot?.request?.tests;

  const headers = folderRoot?.request?.headers || [];
  const activeHeadersCount = headers.filter((header) => header.enabled).length;

  const requestVars = folderRoot?.request?.vars?.req || [];
  const responseVars = folderRoot?.request?.vars?.res || [];
  const activeVarsCount = requestVars.filter((v) => v.enabled).length + responseVars.filter((v) => v.enabled).length;

  const setTab = (tab) => {
    dispatch(
      updatedFolderSettingsSelectedTab({
        collectionUid: collection?.uid,
        folderUid: folder?.uid,
        tab
      })
    );
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'headers': {
        return <Headers collection={collection} folder={folder} />;
      }
      case 'script': {
        return <Script collection={collection} folder={folder} />;
      }
      case 'test': {
        return <Tests collection={collection} folder={folder} />;
      }
      case 'vars': {
        return <Vars collection={collection} folder={folder} />;
      }
      case 'docs': {
        return <Documentation collection={collection} folder={folder} />;
      }
    }
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === tab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full">
      <div className="flex flex-col h-full relative px-4 py-4">
        <div className="flex flex-wrap items-center tabs" role="tablist">
          <div className={getTabClassname('headers')} role="tab" onClick={() => setTab('headers')}>
            Headers
            {activeHeadersCount > 0 && <sup className="ml-1 font-medium">{activeHeadersCount}</sup>}
          </div>
          <div className={getTabClassname('script')} role="tab" onClick={() => setTab('script')}>
            Script
            {hasScripts && <ContentIndicator />}
          </div>
          <div className={getTabClassname('test')} role="tab" onClick={() => setTab('test')}>
            Test
            {hasTests && <ContentIndicator />}
          </div>
          <div className={getTabClassname('vars')} role="tab" onClick={() => setTab('vars')}>
            Vars
            {activeVarsCount > 0 && <sup className="ml-1 font-medium">{activeVarsCount}</sup>}
          </div>
          <div className={getTabClassname('docs')} role="tab" onClick={() => setTab('docs')}>
            Docs
          </div>
        </div>
        <section className={`flex mt-4 h-full`}>{getTabPanel(tab)}</section>
      </div>
    </StyledWrapper>
  );
};

export default FolderSettings;
