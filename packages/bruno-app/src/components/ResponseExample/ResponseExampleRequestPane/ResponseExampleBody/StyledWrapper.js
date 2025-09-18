import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  .title {
    font-weight: 700;
    color: ${(props) => props.theme.text};
  }

  font-size: 0.8125rem;

  .body-mode-selector {
    background: transparent;
    border-radius: 3px;

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
      padding-left: 1.5rem !important;
    }

    .label-item {
      padding: 0.2rem 0.6rem !important;
    }

    .selected-body-mode {
      color: ${(props) => props.theme.colors.text.yellow};
    }

    &.cursor-default {
      opacity: 0.6;
      
      .selected-body-mode {
        color: ${(props) => props.theme.colors.text.muted};
      }
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }

  .btn-action {
    border-radius: 3px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.theme.colors.text.muted};
    
    &:hover {
      opacity: 0.9;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .no-body-text {
    color: ${(props) => props.theme.colors.text.muted};
  }

  /* CodeEditor container */
  .code-editor-container {
    flex: 1;
    min-height: 200px;
    height: 200px;
    border-top: none;
  }
`;

export default StyledWrapper;
