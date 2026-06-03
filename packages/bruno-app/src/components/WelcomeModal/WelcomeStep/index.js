import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconFolder as IconFolderTabler,
  IconGitFork,
  IconLock,
  IconRocket
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const WelcomeStep = () => {
  const { t } = useTranslation();

  const highlights = [
    {
      icon: IconFolderTabler,
      title: t('WELCOME.HIGHLIGHT_FILESYSTEM_TITLE'),
      desc: t('WELCOME.HIGHLIGHT_FILESYSTEM_DESC')
    },
    {
      icon: IconGitFork,
      title: t('WELCOME.HIGHLIGHT_GIT_TITLE'),
      desc: t('WELCOME.HIGHLIGHT_GIT_DESC')
    },
    {
      icon: IconLock,
      title: t('WELCOME.HIGHLIGHT_PRIVACY_TITLE'),
      desc: t('WELCOME.HIGHLIGHT_PRIVACY_DESC')
    },
    {
      icon: IconRocket,
      title: t('WELCOME.HIGHLIGHT_FAST_TITLE'),
      desc: t('WELCOME.HIGHLIGHT_FAST_DESC')
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
