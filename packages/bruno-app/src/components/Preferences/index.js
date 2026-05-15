import classnames from 'classnames';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateActivePreferencesTab } from 'providers/ReduxStore/slices/app';
import { useTranslation } from 'react-i18next';
import {
  IconSettings,
  IconPalette,
  IconBrowser,
  IconUserCircle,
  IconKeyboard,
  IconZoomQuestion,
  IconSquareLetterB,
  IconDatabase,
  IconLanguage
} from '@tabler/icons';

import Support from './Support';
import General from './General';
import Themes from './Themes';
import Proxy from './ProxySettings';
import Display from './Display';
import Keybindings from './Keybindings';
import Beta from './Beta';
import Language from './Language';

import StyledWrapper from './StyledWrapper';
import Cache from './Cache/index';

const Preferences = () => {
  const dispatch = useDispatch();
  const tab = useSelector((state) => state.app.activePreferencesTab);
  const { t } = useTranslation();

  const setTab = (tab) => {
    dispatch(updateActivePreferencesTab({ tab }));
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === tab
    });
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'general': {
        return <General />;
      }

      case 'themes': {
        return <Themes />;
      }

      case 'proxy': {
        return <Proxy />;
      }

      case 'display': {
        return <Display />;
      }

      case 'keybindings': {
        return <Keybindings />;
      }

      case 'beta': {
        return <Beta />;
      }

      case 'language': {
        return <Language />;
      }

      case 'support': {
        return <Support />;
      }

      case 'cache': {
        return <Cache />;
      }
    }
  };

  return (
    <StyledWrapper className="h-full">
      <div className="flex flex-row gap-2 h-full">
        <div className="flex flex-col items-center tabs tablist" role="tablist">
          <div className={getTabClassname('general')} role="tab" onClick={() => setTab('general')}>
            <IconSettings size={16} strokeWidth={1.5} />
            {t('PREFERENCES.GENERAL')}
          </div>
          <div className={getTabClassname('themes')} role="tab" onClick={() => setTab('themes')}>
            <IconPalette size={16} strokeWidth={1.5} />
            {t('PREFERENCES.THEMES')}
          </div>
          <div className={getTabClassname('display')} role="tab" onClick={() => setTab('display')}>
            <IconBrowser size={16} strokeWidth={1.5} />
            {t('PREFERENCES.DISPLAY')}
          </div>
          <div className={getTabClassname('proxy')} role="tab" onClick={() => setTab('proxy')}>
            <IconUserCircle size={16} strokeWidth={1.5} />
            {t('PREFERENCES.PROXY')}
          </div>
          <div className={getTabClassname('keybindings')} role="tab" onClick={() => setTab('keybindings')}>
            <IconKeyboard size={16} strokeWidth={1.5} />
            {t('PREFERENCES.KEYBINDINGS')}
          </div>
          <div className={getTabClassname('cache')} role="tab" onClick={() => setTab('cache')}>
            <IconDatabase size={16} strokeWidth={1.5} />
            {t('PREFERENCES.CACHE')}
          </div>
          <div className={getTabClassname('support')} role="tab" onClick={() => setTab('support')}>
            <IconZoomQuestion size={16} strokeWidth={1.5} />
            {t('PREFERENCES.SUPPORT')}
          </div>
          <div className={getTabClassname('beta')} role="tab" onClick={() => setTab('beta')}>
            <IconSquareLetterB size={16} strokeWidth={1.5} />
            {t('PREFERENCES.BETA')}
          </div>
          <div className={getTabClassname('language')} role="tab" onClick={() => setTab('language')}>
            <IconLanguage size={16} strokeWidth={1.5} />
            {t('PREFERENCES.LANGUAGE')}
          </div>
        </div>
        <section
          className="flex flex-grow ps-2 pe-4 pt-2 pb-6 p-[12px] tab-panel"
          role="tabpanel"
          id={`${tab}-panel`}
          aria-labelledby={`${tab}-tab`}
        >
          {getTabPanel(tab)}
        </section>
      </div>
    </StyledWrapper>
  );
};

export default Preferences;
