import React from 'react';
import {
  IconFolder as IconFolderTabler,
  IconGitFork,
  IconLock,
  IconRocket
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const WelcomeStep = () => {
  const { t } = useTranslation();

  const highlights = [
    {
      icon: IconFolderTabler,
      title: t('WELCOME.FILESYSTEM_ONLY'),
      desc: t('WELCOME.FILESYSTEM_DESC')
    },
    {
      icon: IconGitFork,
      title: t('WELCOME.GIT_FRIENDLY'),
      desc: t('WELCOME.GIT_FRIENDLY_DESC')
    },
    {
      icon: IconLock,
      title: t('WELCOME.PRIVACY_FOCUSED'),
      desc: t('WELCOME.PRIVACY_FOCUSED_DESC')
    },
    {
      icon: IconRocket,
      title: t('WELCOME.FAST_LIGHTWEIGHT'),
      desc: t('WELCOME.FAST_LIGHTWEIGHT_DESC')
    }
  ];

  return (
    <StyledWrapper className="step-body">
      <div className="highlights">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="highlight-item">
              <div className="highlight-icon">
                <Icon size={18} stroke={1.5} />
              </div>
              <div>
                <div className="highlight-title">{item.title}</div>
                <div className="highlight-desc">{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </StyledWrapper>
  );
};

export default WelcomeStep;
