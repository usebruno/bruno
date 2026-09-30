import React, { useState } from 'react';
import { isGitRepositoryUrl } from 'utils/git';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
const GitHubTab = ({
  handleSubmit,
  setErrorMessage
}) => {
  const [urlInput, setUrlInput] = useState('');

  const handleGitRepositoryImport = (url) => {
    if (!isGitRepositoryUrl(url)) {
      setErrorMessage('Please enter a valid git repository URL');
      return;
    }
    handleSubmit({ repositoryUrl: url, type: 'git-repository' });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      handleGitRepositoryImport(urlInput.trim());
    }
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="flex gap-2">
        <input
          id="gitUrlInput"
          data-testid="git-url-input"
          type="text"
          value={urlInput}
          autoFocus
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Enter Git repository URL"
          className="flex-1 px-3 py-1 textbox"
        />
        <Button
          type="submit"
          id="clone-git-button"
          disabled={!urlInput.trim()}
          variant="filled"
          color="primary"
          style={{ height: '100%' }}
        >
          Clone
        </Button>
      </div>
    </form>
  );
};

export default GitHubTab;
