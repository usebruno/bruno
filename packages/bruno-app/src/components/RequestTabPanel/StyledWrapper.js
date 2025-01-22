import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.dragging {
    cursor: col-resize;
  }

  div.drag-request {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    min-width: 10px;
    padding: 0;
    cursor: col-resize;
    background: transparent;

    div.drag-request-border {
      display: flex;
      height: 100%;
      width: 1px;
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
    }

    &:hover div.drag-request-border {
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }

  div.graphql-docs-explorer-container {
    background: white;
    outline: none;
    box-shadow: rgb(0 0 0 / 15%) 0px 0px 8px;
    position: absolute;
    right: 0px;
    z-index: 2000;
    width: 350px;
    height: 100%;

    div.doc-explorer-title {
      text-align: left;
    }

    div.doc-explorer-rhs {
      display: flex;
    }
  }

  .response-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 48px;
    position: absolute;
    right: ${props => props.showResponsePane ? 'auto' : '0'};
    top: 50%;
    transform: translateY(-50%);
    background: ${props => props.theme.requestTabPanel.dragbar.border};
    border-radius: 4px 0 0 4px;
    cursor: pointer;
    color: ${props => props.theme.requestTabPanel.responseToggle.color};
    z-index: 10;
    transition: all 0.2s ease-in-out;
    box-shadow: -2px 0 4px rgba(0, 0, 0, 0.1);

    &:hover {
      width: 28px;
      height: 52px;
      background: ${props => props.theme.requestTabPanel.dragbar.activeBorder};
      
      svg {
        transform: scale(1.2);
      }
    }

    svg {
      transition: transform 0.2s ease-in-out;
    }
  }

  .response-pane {
    animation: slideIn 0.3s ease-in-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .response-pane-exit {
    animation: slideOut 0.3s ease-in-out;
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(20px);
    }
  }
`;


export default StyledWrapper;
