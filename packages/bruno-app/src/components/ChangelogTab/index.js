import React from 'react';
import { IconConfetti } from '@tabler/icons';
import Markdown from 'components/MarkDown';
import { version } from '../../../package.json';
import changelogContent from './CHANGELOG.md';
import StyledWrapper from './StyledWrapper';

const ChangelogTab = () => {
  return (
    <StyledWrapper>
      <div className="changelog-header">
        <IconConfetti size={18} strokeWidth={1.5} />
        <span>What's New</span>
        <span className="header-version">v{version}</span>
      </div>
      <div className="changelog-body">
        <Markdown content={changelogContent} onDoubleClick={() => {}} />
      </div>
    </StyledWrapper>
  );
};

export default ChangelogTab;
