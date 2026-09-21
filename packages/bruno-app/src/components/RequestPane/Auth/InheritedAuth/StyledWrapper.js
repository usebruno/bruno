import styled from 'styled-components';

const Wrapper = styled.div`
  &.inherited-auth-source {
    display: flex;
    justify-content: flex-end;
    min-width: 0;
    max-width: 100%;
    flex: 1 1 0;
  }

  .inherited-auth-source-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
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

  .inherit-mode-text {
    color: ${(props) => props.theme.primary.text};
    background: transparent;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      opacity: 0.8;
    }
  }

  .inherited-auth-fields {
    pointer-events: none;
    cursor: not-allowed;
    opacity: 0.65;

    /* Allow expanding collapsed sections so inherited values can be viewed. */
    .auth-advanced-toggle {
      pointer-events: auto;
      cursor: pointer;
    }
  }
`;

export default Wrapper;
