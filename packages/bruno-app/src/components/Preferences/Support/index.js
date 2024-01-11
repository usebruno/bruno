import React from 'react';
import StyledWrapper from './StyledWrapper';
import { Discord } from 'components/Icons/Discord';
import { BookOpen, Github, Megaphone, Twitter } from 'lucide-react';

const Support = () => {
  return (
    <StyledWrapper>
      <div className="rows">
        <div className="mt-2">
          <a href="https://docs.usebruno.com" target="_blank" className="flex items-end">
            <BookOpen size={18} />
            <span className="label ml-2">Documentation</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno/issues" target="_blank" className="flex items-end">
            <Megaphone size={18} />
            <span className="label ml-2">Report Issues</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://discord.com/invite/KgcZUncpjq" target="_blank" className="flex items-end">
            <Discord size={18} />
            <span className="label ml-2">Discord</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://github.com/usebruno/bruno" target="_blank" className="flex items-end">
            <Github size={18} />
            <span className="label ml-2">GitHub</span>
          </a>
        </div>
        <div className="mt-2">
          <a href="https://twitter.com/use_bruno" target="_blank" className="flex items-end">
            <Twitter size={18} />
            <span className="label ml-2">Twitter</span>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Support;
