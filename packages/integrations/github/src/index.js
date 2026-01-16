/**
 * GitHub Integration for Bruno
 *
 * Provides GitHub repository search in GlobalSearch
 * and a sidebar panel showing recent repositories.
 */

import React from 'react';
import GitHubSidebar from './components/GitHubSidebar';

const GitHubIntegration = {
  id: 'github',
  label: 'GitHub Integration',
  description: 'Search GitHub repositories and view recent repos',
  docsUrl: 'https://docs.usebruno.com/integrations/github',

  // Extension slots
  slots: {
    sidebar: {
      component: GitHubSidebar,
      title: 'GitHub'
    },
    search: {
      id: 'github-repos',
      label: 'GitHub',
      search: async (query) => {
        if (!query || query.length < 2) return [];

        try {
          const results = await window.ipcRenderer.invoke('integration:github:search', { query });
          return results.map((repo) => ({
            name: repo.full_name,
            description: repo.description || 'No description',
            path: repo.html_url,
            onSelect: () => {
              // TODO(reaper): validate and secure what's being opened
              window.ipcRenderer.openExternal(repo.html_url);
            }
          }));
        } catch (err) {
          console.error('GitHub search failed:', err);
          return [];
        }
      }
    }
  },

  // Lifecycle hooks
  init: async (context) => {
    context.logger?.info('GitHub integration initialized');

    // Return dispose function
    return () => {
      context.logger?.info('GitHub integration disposed');
    };
  }
};

export { GitHubIntegration };
