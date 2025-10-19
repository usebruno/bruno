import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

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
    display: flex;
    flex-direction: column;

    &:last-child {
      margin-bottom: 0;
    }

    /* When collapsed, take minimal space */
    &.collapsed {
      flex: 0 0 auto;
    }

    /* When expanded, take all available space */
    &.expanded {
      flex: 1;
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
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .script-editor-container {
    flex: 1;
    min-height: 200px;
    display: flex;
    flex-direction: column;

    div.CodeMirror {
      flex-direction: column !important;
      flex: 1;
    }
  }
`;

export default StyledWrapper;
