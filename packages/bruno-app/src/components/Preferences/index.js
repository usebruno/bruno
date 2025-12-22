import Modal from 'components/Modal/index';
import classnames from 'classnames';
import React, { useState } from 'react';
import {
  IconSearch,
  IconSettings,
  IconDeviceDesktop,
  IconWorld,
  IconKey,
  IconStar,
  IconShield,
  IconKeyboard,
  IconHelp,
  IconFlask,
  IconInfoCircle
} from '@tabler/icons';

import Support from './Support';
import General from './General';
import Proxy from './ProxySettings';
import Display from './Display';
import Keybindings from './Keybindings';
import Beta from './Beta';

import StyledWrapper from './StyledWrapper';

const Preferences = ({ onClose }) => {
  const [tab, setTab] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');

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

      case 'proxy': {
        return <Proxy close={onClose} />;
      }

      case 'display': {
        return <Display close={onClose} />;
      }

      case 'keybindings': {
        return <Keybindings close={onClose} />;
      }

      case 'beta': {
        return <Beta close={onClose} />;
      }

      case 'support': {
        return <Support />;
      }
    }
  };

  return (
    <StyledWrapper>
      <Modal size="lg" title="Preferences" handleCancel={onClose} hideFooter={true}>
        <div className="flex flex-row gap-4 mx-[-1rem] !my-[-1.5rem] py-2">
          <div className="flex flex-col tabs" role="tablist">
            <div className="search-container">
              <IconSearch size={14} strokeWidth={1.5} className="search-icon" />
              <input
                type="text"
                placeholder="Search"
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={getTabClassname('general')} role="tab" onClick={() => setTab('general')}>
              <IconSettings size={16} strokeWidth={1.5} />
              <span>General</span>
            </div>
            <div className={getTabClassname('display')} role="tab" onClick={() => setTab('display')}>
              <IconDeviceDesktop size={16} strokeWidth={1.5} />
              <span>Display</span>
            </div>
            <div className={getTabClassname('proxy')} role="tab" onClick={() => setTab('proxy')}>
              <IconWorld size={16} strokeWidth={1.5} />
              <span>Proxy</span>
            </div>
            <div className={getTabClassname('keybindings')} role="tab" onClick={() => setTab('keybindings')}>
              <IconKeyboard size={16} strokeWidth={1.5} />
              <span>Keybindings</span>
            </div>
            <div className={getTabClassname('support')} role="tab" onClick={() => setTab('support')}>
              <IconHelp size={16} strokeWidth={1.5} />
              <span>Support</span>
            </div>
            <div className={getTabClassname('beta')} role="tab" onClick={() => setTab('beta')}>
              <IconFlask size={16} strokeWidth={1.5} />
              <span>Beta</span>
            </div>
          </div>
          <section className="flex flex-grow px-4 pt-2 pb-4 tab-panel">{getTabPanel(tab)}</section>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default Preferences;
