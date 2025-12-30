import Modal from 'components/Modal/index';
import classnames from 'classnames';
import React, { useState } from 'react';
import { IconSettings, IconPalette, IconBrowser, IconUserCircle, IconKeyboard, IconZoomQuestion, IconSquareLetterB, IconBolt } from '@tabler/icons';

import Support from './Support';
import General from './General';
import Themes from './Themes';
import Proxy from './ProxySettings';
import Display from './Display';
import Keybindings from './Keybindings';
import Beta from './Beta';
import AISettings from './AISettings';

import StyledWrapper from './StyledWrapper';

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

      case 'themes': {
        return <Themes close={onClose} />;
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

      case 'ai': {
        return <AISettings close={onClose} />;
      }
    }
  };

  return (
    <StyledWrapper>
      <Modal size="lg" title="Preferences" handleCancel={onClose} hideFooter={true}>
        <div className="flex flex-row gap-2 mx-[-1rem] !my-[-1.5rem] py-2">
          <div className="flex flex-col items-center tabs" role="tablist">
            <div className={getTabClassname('general')} role="tab" onClick={() => setTab('general')}>
              <IconSettings size={16} strokeWidth={1.5} />
              General
            </div>
            <div className={getTabClassname('themes')} role="tab" onClick={() => setTab('themes')}>
              <IconPalette size={16} strokeWidth={1.5} />
              Themes
            </div>
            <div className={getTabClassname('display')} role="tab" onClick={() => setTab('display')}>
              <IconBrowser size={16} strokeWidth={1.5} />
              Display
            </div>
            <div className={getTabClassname('proxy')} role="tab" onClick={() => setTab('proxy')}>
              <IconUserCircle size={16} strokeWidth={1.5} />
              Proxy
            </div>
            <div className={getTabClassname('keybindings')} role="tab" onClick={() => setTab('keybindings')}>
              <IconKeyboard size={16} strokeWidth={1.5} />
              Keybindings
            </div>
            <div className={getTabClassname('ai')} role="tab" onClick={() => setTab('ai')}>
              <IconBolt size={16} strokeWidth={1.5} />
              AI
            </div>
            <div className={getTabClassname('support')} role="tab" onClick={() => setTab('support')}>
              <IconZoomQuestion size={16} strokeWidth={1.5} />
              Support
            </div>
            <div className={getTabClassname('beta')} role="tab" onClick={() => setTab('beta')}>
              <IconSquareLetterB size={16} strokeWidth={1.5} />
              Beta
            </div>
          </div>
          <section className="flex flex-grow px-2 pt-2 pb-6 tab-panel">{getTabPanel(tab)}</section>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default Preferences;
