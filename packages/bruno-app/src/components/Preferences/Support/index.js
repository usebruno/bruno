import React from 'react';
import {
  IconSpeakerphone,
  IconBrandTwitter,
  IconBrandGithub,
  IconBrandDiscord,
  IconBook,
  IconExternalLink
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const SUPPORT_GROUPS = [
  {
    key: 'help',
    label: 'SUPPORT.HELP',
    links: [
      {
        key: 'documentation',
        icon: IconBook,
        url: 'https://docs.usebruno.com',
        label: 'COMMON.DOCUMENTATION',
        description: 'SUPPORT.DOCUMENTATION_DESCRIPTION'
      },
      {
        key: 'report-issues',
        icon: IconSpeakerphone,
        url: 'https://github.com/usebruno/bruno/issues',
        label: 'COMMON.REPORT_ISSUES',
        description: 'SUPPORT.REPORT_ISSUES_DESCRIPTION'
      }
    ]
  },
  {
    key: 'community',
    label: 'SUPPORT.COMMUNITY',
    links: [
      {
        key: 'discord',
        icon: IconBrandDiscord,
        url: 'https://discord.com/invite/KgcZUncpjq',
        label: 'COMMON.DISCORD',
        description: 'SUPPORT.DISCORD_DESCRIPTION'
      },
      {
        key: 'github',
        icon: IconBrandGithub,
        url: 'https://github.com/usebruno/bruno',
        label: 'COMMON.GITHUB',
        description: 'SUPPORT.GITHUB_DESCRIPTION'
      },
      {
        key: 'twitter',
        icon: IconBrandTwitter,
        url: 'https://twitter.com/use_bruno',
        label: 'COMMON.TWITTER',
        description: 'SUPPORT.TWITTER_DESCRIPTION'
      }
    ]
  }
];

const Support = () => {
  const { t } = useTranslation();

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">Support</div>

      {SUPPORT_GROUPS.map((group) => (
        <section className="support-group" key={group.key} aria-labelledby={`support-${group.key}-label`}>
          <h3 className="support-group-label select-none" id={`support-${group.key}-label`}>
            {t(group.label)}
          </h3>
          <div className="support-card">
            {group.links.map(({ key, icon: Icon, url, label, description }) => (
              <a
                key={key}
                className="support-link"
                href={url}
                target="_blank"
                rel="noreferrer"
                data-testid={`support-${key}`}
              >
                <Icon className="support-link-icon" size={18} strokeWidth={1.5} aria-hidden="true" />
                <span className="support-link-text">
                  <span className="support-link-label">{t(label)}</span>
                  <span className="support-link-description">{t(description)}</span>
                </span>
                <IconExternalLink className="support-link-affordance" size={16} strokeWidth={1.5} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      ))}
    </StyledWrapper>
  );
};

export default Support;
