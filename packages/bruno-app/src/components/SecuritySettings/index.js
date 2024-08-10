import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { useDispatch } from 'react-redux';
import { updateSecuritySettingsSelectedTab } from 'providers/ReduxStore/slices/collections/index';
import JSRuntime from './JSRuntime/index';
import AppMode from './AppMode/index';

const SecuritySettings = ({ collection }) => {
  const dispatch = useDispatch();
  const activeTab = collection.securitySettingsSelectedTab || 'appMode';
  const selectTab = (tab) => {
    dispatch(
      updateSecuritySettingsSelectedTab({
        collectionUid: collection.uid,
        tab
      })
    );
  };
  const getTabPanel = (tab) => {
    switch (tab) {
      case 'appMode': {
        return <AppMode collection={collection} />;
      }
      case 'jsRuntime': {
        return <JSRuntime collection={collection} />;
      }
      default: {
        return <div className="mt-4">404 | Not found</div>;
      }
    }
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === activeTab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative px-4 py-4">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('appMode')} role="tab" onClick={() => selectTab('appMode')}>
          App Mode
        </div>
        <div className={getTabClassname('jsRuntime')} role="tab" onClick={() => selectTab('jsRuntime')}>
          JS Runtime
        </div>
      </div>
      <section className="mt-4 h-full">{getTabPanel(activeTab)}</section>
    </StyledWrapper>
  );
};

export default SecuritySettings;
