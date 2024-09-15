import React from 'react';
import classnames from 'classnames';
import { updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import Headers from './Headers';
import Script from './Script';
import Tests from './Tests';
import StyledWrapper from './StyledWrapper';
import Vars from './Vars';

const FolderSettings = ({ collection, folder }) => {
  const dispatch = useDispatch();
  let tab = 'headers';
  const { folderLevelSettingsSelectedTab } = collection;
  if (folderLevelSettingsSelectedTab?.[folder?.uid]) {
    tab = folderLevelSettingsSelectedTab[folder?.uid];
  }

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
          </div>
          <div className={getTabClassname('script')} role="tab" onClick={() => setTab('script')}>
            Script
          </div>
          <div className={getTabClassname('test')} role="tab" onClick={() => setTab('test')}>
            Test
          </div>
          <div className={getTabClassname('vars')} role="tab" onClick={() => setTab('vars')}>
            Vars
          </div>
        </div>
        <section className={`flex mt-4 h-full`}>{getTabPanel(tab)}</section>
      </div>
    </StyledWrapper>
  );
};

export default FolderSettings;
