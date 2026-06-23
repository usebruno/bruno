import styled from 'styled-components';

const StyledWrapper = styled.div`
  .url-bar-container {
    border: 1px solid var(--border-color);
    background: var(--bg-color-secondary);
  }

  .method {
    min-width: 72px;
  }

  .method-get { color: #22c55e; }
  .method-post { color: #f59e0b; }
  .method-put { color: #3b82f6; }
  .method-patch { color: #a855f7; }
  .method-delete { color: #ef4444; }

  .editor-section {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    min-height: 240px;
  }
`;

export default StyledWrapper;
