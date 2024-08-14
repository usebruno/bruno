import React from 'react';
import { IconSpeakerphone, IconBrandTwitter, IconBrandGithub, IconBrandDiscord, IconBook } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useDictionary } from 'providers/Dictionary/index';

const Support = () => {
  const { dictionary } = useDictionary();

  return (
    <StyledWrapper>
      <div className="rows">
        <div className="mt-2">
          <a href="https://docs.usebruno.com" target="_blank" className="flex items-end">
            <IconBook size={18} strokeWidth={2} />
            <span className="label ml-2">{dictionary.documentation}</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno/issues" target="_blank" className="flex items-end">
            <IconSpeakerphone size={18} strokeWidth={2} />
            <span className="label ml-2">{dictionary.reportIssues}</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://discord.com/invite/KgcZUncpjq" target="_blank" className="flex items-end">
            <IconBrandDiscord size={18} strokeWidth={2} />
            <span className="label ml-2">{dictionary.discord}</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno" target="_blank" className="flex items-end">
            <IconBrandGithub size={18} strokeWidth={2} />
            <span className="label ml-2">{dictionary.gitHub}</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://twitter.com/use_bruno" target="_blank" className="flex items-end">
            <IconBrandTwitter size={18} strokeWidth={2} />
            <span className="label ml-2">{dictionary.twitter}</span>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Support;
