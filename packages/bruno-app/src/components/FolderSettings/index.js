import React from 'react';
import classnames from 'classnames';
import { updateSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import Headers from './Headers';

const FolderSettings = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const tab = folder?.settingsSelectedTab || 'headers';
  const setTab = (tab) => {
    dispatch(
      updateSettingsSelectedTab({
        collectionUid: folder.collectionUid,
        folderUid: folder.uid,
        tab
      })
    );
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'headers': {
        return <Headers collection={collection} folder={folder} />;
      }
      // TODO: Add auth
    }
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === tab
    });
  };

  return (
    <div className="flex flex-col h-full relative px-4 py-4">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('headers')} role="tab" onClick={() => setTab('headers')}>
          Headers
        </div>
        {/* <div className={getTabClassname('auth')} role="tab" onClick={() => setTab('auth')}>
          Auth
        </div> */}
      </div>
      <section className={`flex ${['auth', 'script', 'docs', 'clientCert'].includes(tab) ? '' : 'mt-4'}`}>
        {getTabPanel(tab)}
      </section>
    </div>
  );
};

export default FolderSettings;
