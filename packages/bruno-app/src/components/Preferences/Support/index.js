import React from 'react';
import { IconSpeakerphone, IconBrandTwitter, IconBrandGithub, IconBrandDiscord, IconBook } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const Support = () => {
  const { t } = useTranslation();

  return (
    <StyledWrapper>
      <div className="rows">
        <div className="mt-2">
          <a href="https://docs.usebruno.com" target="_blank" className="flex items-end">
            <IconBook size={18} strokeWidth={2} />
            <span className="label ml-2">{t('COMMON.DOCUMENTATION')}</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno/issues" target="_blank" className="flex items-end">
            <IconSpeakerphone size={18} strokeWidth={2} />
            <span className="label ml-2">{t('COMMON.REPORT_ISSUES')}</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://discord.com/invite/KgcZUncpjq" target="_blank" className="flex items-end">
            <IconBrandDiscord size={18} strokeWidth={2} />
            <span className="label ml-2">{t('COMMON.DISCORD')}</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno" target="_blank" className="flex items-end">
            <IconBrandGithub size={18} strokeWidth={2} />
            <span className="label ml-2">{t('COMMON.GITHUB')}</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://twitter.com/use_bruno" target="_blank" className="flex items-end">
            <IconBrandTwitter size={18} strokeWidth={2} />
            <span className="label ml-2">{t('COMMON.TWITTER')}</span>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Support;
