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
