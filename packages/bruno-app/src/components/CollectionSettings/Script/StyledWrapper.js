import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-width: 800px;

  div.CodeMirror {
    height: inherit;
    min-height: 200px;
  }

  div.title {
    color: var(--color-tab-inactive);
    font-weight: 500;
  }

  .script-section {
    border: 1px solid ${props => props.theme.input.border};
    border-radius: 4px;
    margin-bottom: 0.5rem;
    overflow: hidden;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .script-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: transparent;
    cursor: pointer;
    font-weight: 500;
    border: none;
    width: 100%;

    &:hover {
      background-color: ${props => props.theme.plainGrid.hoverBg};
    }

    .chevron-icon {
      color: var(--color-tab-inactive);
    }
  }

  .script-content {
    padding: 1rem;
    border-top: 1px solid ${props => props.theme.input.border};
  }

  .script-editor-container {
    height: 50vh;
    min-height: 300px;
    max-height: 600px;
    display: flex;
    flex-direction: column;
  }
`;

export default StyledWrapper;
