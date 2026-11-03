import styled from 'styled-components';

const Wrapper = styled.div`
  &.inherited-auth-source {
    display: flex;
    justify-content: flex-start;
    max-width: 100%;
  }

  .inherited-auth-source-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
  }

  .inherited-auth-source-copy {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .inherited-auth-source-name {
    font-weight: 600;
  }

  .inherit-mode-text {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: ${(props) => props.theme.primary.text};
    background: transparent;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      opacity: 0.8;
    }
  }

  .inherited-auth-fields {
    .single-line-editor.read-only,
    .multi-line-editor.read-only,
    input:disabled,
    select:disabled {
      opacity: 0.5;
    }

    .single-line-editor.read-only .CodeMirror-lines {
      cursor: not-allowed;
    }

    .read-only .hovered-link.CodeMirror-link {
      text-decoration: none !important;
    }
  }
`;

export default Wrapper;
