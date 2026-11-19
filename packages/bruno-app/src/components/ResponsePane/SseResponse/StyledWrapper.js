import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: ${({ theme }) => theme.text};

  .muted, .empty-state {
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: 12px;
  }

  button, select, input:not([type='checkbox']) {
    border: 1px solid ${({ theme }) => theme.border.border1};
    background: ${({ theme }) => theme.bg};
    color: inherit;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    min-width: 0;
  }

  button { cursor: pointer; }

  .sse-toolbar, .view-tabs, .mode-selector, .rule-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sse-toolbar {
    padding-bottom: 12px;
    flex-shrink: 0;
  }

  .mode-selector { margin-left: auto; }

  .view-tabs button[aria-selected='true'] {
    color: ${({ theme }) => theme.tabs.active.color};
    border-color: ${({ theme }) => theme.tabs.active.border};
  }

  .sse-rules {
    padding: 12px;
    border: 1px solid ${({ theme }) => theme.border.border1};
    border-radius: 6px;
    margin-bottom: 12px;
    overflow-y: auto;
    max-height: 50%;
    flex-shrink: 0;
  }

  summary { cursor: pointer; }
  .sse-rules p { margin: 8px 0; }
  .rule { margin-bottom: 8px; }
  .rule-inputs {
    display: grid;
    grid-template-columns: minmax(70px, 1fr) minmax(100px, 3fr) auto auto;
    gap: 6px;
  }
  .jsonpath { font-family: monospace; }
  .rule-error { color: ${({ theme }) => theme.colors.text.danger}; font-size: 12px; margin-top: 4px; }
  .rule-actions { font-size: 12px; }
  .rule-actions label { display: flex; align-items: center; gap: 6px; }
  .sse-merged, .sse-events { flex: 1; min-height: 0; overflow-y: auto; }
  .empty-state { padding: 16px 0; }
`;

export default StyledWrapper;
