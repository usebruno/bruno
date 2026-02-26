import React from 'react';
import {
  IconFolder as IconFolderTabler,
  IconGitFork,
  IconLock,
  IconRocket
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const highlights = [
  {
    icon: IconFolderTabler,
    title: 'Filesystem-first',
    desc: 'Collections are plain files on your disk. No cloud sync, no proprietary lock-in. Your data stays yours.'
  },
  {
    icon: IconGitFork,
    title: 'Git-friendly',
    desc: 'Every request is a readable file. Commit, branch, review, and collaborate using the tools you already know.'
  },
  {
    icon: IconLock,
    title: 'Privacy-focused',
    desc: 'No accounts required. No telemetry. Bruno works entirely offline — your API keys never leave your machine.'
  },
  {
    icon: IconRocket,
    title: 'Fast and lightweight',
    desc: 'Built to be snappy. No bloated runtimes — just a fast, focused tool for exploring and testing APIs.'
  }
];

const WelcomeStep = () => (
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

export default WelcomeStep;
