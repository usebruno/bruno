import Modal from 'components/Modal/index';
import classnames from 'classnames';
import React, { useState } from 'react';
import { 
  IconSettings, 
  IconPalette, 
  IconNetwork,
  IconKey,
  IconHelp,
} from '@tabler/icons';

import Support from './Support';
import General from './General';
import Proxy from './ProxySettings';
import Display from './Display';
import Keybindings from './Keybindings';

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

      case 'proxy': {
        return <Proxy close={onClose} />;
      }

      case 'display': {
        return <Display close={onClose} />;
      }

      case 'keybindings': {
        return <Keybindings close={onClose} />;
      }

      case 'support': {
        return <Support />;
      }
    }
  };

  return (
    <StyledWrapper>
      <Modal size="lg" title="Preferences" handleCancel={onClose} hideFooter={true}>
        <div className='flex flex-row mx-[-1rem] !my-[-1.5rem] h-[500px]'>
          <div className="flex flex-col tabs" role="tablist">
            <div className={getTabClassname('general')} role="tab" onClick={() => setTab('general')}>
              <IconSettings size={18} strokeWidth={1.5} />
              General
            </div>
            <div className={getTabClassname('display')} role="tab" onClick={() => setTab('display')}>
              <IconPalette size={18} strokeWidth={1.5} />
              Display
            </div>
            <div className={getTabClassname('proxy')} role="tab" onClick={() => setTab('proxy')}>
              <IconNetwork size={18} strokeWidth={1.5} />
              Proxy
            </div>
            <div className={getTabClassname('keybindings')} role="tab" onClick={() => setTab('keybindings')}>
              <IconKey size={18} strokeWidth={1.5} />
              Keybindings
            </div>
            <div className={getTabClassname('support')} role="tab" onClick={() => setTab('support')}>
              <IconHelp size={18} strokeWidth={1.5} />
              Support
            </div>
          </div>
          <section className="tab-panel">{getTabPanel(tab)}</section>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default Preferences;
