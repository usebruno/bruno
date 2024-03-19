import React from 'react';
import { IconSpeakerphone, IconBrandDiscord } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const Support = () => {
  return (
    <StyledWrapper>
      <div className="rows">
        <div className="mt-2">
          <a href="https://github.com/its-treason/bruno/issues" target="_blank" className="flex items-end">
            <IconSpeakerphone size={18} strokeWidth={2} />
            <span className="label ml-2">Report Issues</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://discordapp.com/users/139058134596583424" target="_blank" className="flex items-end">
            <IconBrandDiscord size={18} strokeWidth={2} />
            <span className="label ml-2">Discord</span>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Support;
