import Modal from 'components/Modal/index';
import classnames from 'classnames';
import React, { useState } from 'react';
import Support from './Support';
import General from './General';
import Proxy from './ProxySettings';
import StyledWrapper from './StyledWrapper';
import Interface from 'components/Preferences/Interface';

const Preferences = ({ onClose }) => {
  const [tab, setTab] = useState('general');

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === tab
    });
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'general': {
        return <General close={onClose} />;
      }

      case 'interface': {
        return <Interface close={onClose} />;
      }

      case 'proxy': {
        return <Proxy close={onClose} />;
      }

      case 'support': {
        return <Support />;
      }
    }
  };

  return (
    <StyledWrapper>
      <Modal size="lg" title="Preferences" handleCancel={onClose} hideFooter={true}>
        <div className="flex items-center px-2 tabs" role="tablist">
          <div className={getTabClassname('general')} role="tab" onClick={() => setTab('general')}>
            General
          </div>
          <div className={getTabClassname('interface')} role="tab" onClick={() => setTab('interface')}>
            Interface
          </div>
          <div className={getTabClassname('proxy')} role="tab" onClick={() => setTab('proxy')}>
            Proxy
          </div>
          <div className={getTabClassname('support')} role="tab" onClick={() => setTab('support')}>
            Support
          </div>
        </div>
        <section className="flex flex-grow px-2 mt-4 tab-panel">{getTabPanel(tab)}</section>
      </Modal>
    </StyledWrapper>
  );
};

export default Preferences;
