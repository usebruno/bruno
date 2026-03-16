import React, { useState, useEffect } from 'react';
import { IconCopy, IconGitBranch } from '@tabler/icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import CodeEditor from 'components/CodeEditor/index';
import { useTheme } from 'providers/Theme';
import { escapeHtml } from 'utils/response';
import { Tabs, TabsList, TabsTrigger } from 'components/Tabs';
import StyledWrapper from './StyledWrapper';

const FETCH_BASE = 'https://fetch.usebruno.com';

const EMBED_CODE_TABS = [
  { value: 'html', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' }
];

// Escape so the URL can't break out of the attribute when the snippet is pasted into HTML.
const getHtmlEmbedCode = (gitRemoteUrl) => {
  if (!gitRemoteUrl) return '';
  return `<!-- Fetch in Bruno Button (Workspace) -->
<div class="bruno-fetch-button" data-bruno-collection-url="${escapeHtml(gitRemoteUrl)}"></div>
<script src="${FETCH_BASE}/button.js"></script>`;
};

const getMarkdownEmbedCode = (gitRemoteUrl) => gitRemoteUrl
  ? `[<img src="${FETCH_BASE}/button.svg" alt="Fetch in Bruno" style="width: 130px; height: 30px;" width="128" height="32">](${FETCH_BASE}/?url=${encodeURIComponent(gitRemoteUrl)} "target=_blank rel=noopener noreferrer")`
  : '';

const EmbedWorkspace = ({ workspace }) => {
  const { displayedTheme } = useTheme();
  const [embedTab, setEmbedTab] = useState('html');
  const [gitRemoteUrl, setGitRemoteUrl] = useState('');

  useEffect(() => {
    if (!workspace?.pathname || !window.ipcRenderer) return;
    window.ipcRenderer
      .invoke('renderer:get-collection-git-details', workspace.pathname)
      .then((data) => {
        console.log('data', data);
        if (data?.gitRootPath && data?.gitRepoUrl) {
          setGitRemoteUrl(data.gitRepoUrl.trim());
        }
      })
      .catch(() => {});
  }, [workspace?.pathname]);

  const embedCode = embedTab === 'html' ? getHtmlEmbedCode(gitRemoteUrl) : getMarkdownEmbedCode(gitRemoteUrl);

  if (!gitRemoteUrl) {
    return (
      <StyledWrapper>
        <p className="embed-description">
          Embed a Fetch in Bruno button in README&apos;s, your website, or anywhere you want to make it easy for developers to clone and run your workspace. Learn more about{' '}
          <a href="https://docs.usebruno.com/to/embed-bruno-collection" target="_blank" rel="noopener noreferrer" className="opencollection-link">
            Fetch in Bruno
          </a>
        </p>
        <div className="embed-warning-box">
          ⚠️ Creating an embedded &apos;Fetch in Bruno&apos; button requires a synchronized local and remote Git repository
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="embed-section">
        <p className="embed-description">
          Embed a Fetch in Bruno button in README&apos;s, your website, or anywhere you want to make it easy for developers to clone and run your workspace. Learn more about{' '}
          <a href="https://docs.usebruno.com/git-integration/embed-bruno-collection" target="_blank" rel="noopener noreferrer" className="opencollection-link">
            Fetch in Bruno
          </a>
          .
        </p>
        <div className="embed-remote-url-card">
          <IconGitBranch size={18} strokeWidth={1.5} className="embed-remote-icon" />
          <span className="embed-remote-url">{gitRemoteUrl}</span>
        </div>
      </div>

      <div className="embed-tabs-row">
        <Tabs value={embedTab} onValueChange={setEmbedTab}>
          <TabsList>
            {EMBED_CODE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="embed-code-wrap">
        <div className="embed-code-container code-container">
          <CodeEditor
            value={embedCode}
            theme={displayedTheme}
            mode={embedTab === 'html' ? 'text/html' : 'text/x-markdown'}
          />
        </div>
        <CopyToClipboard text={embedCode} onCopy={() => toast.success('Copied to clipboard!')}>
          <button type="button" className="embed-copy-btn">
            <IconCopy size={18} strokeWidth={1.5} />
          </button>
        </CopyToClipboard>
      </div>
    </StyledWrapper>
  );
};

export default EmbedWorkspace;
