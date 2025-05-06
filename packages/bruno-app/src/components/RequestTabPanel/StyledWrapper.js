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
    position: relative;

    div.drag-request-border {
      display: flex;
      height: 100%;
      width: 1px;
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
    }

    &:hover div.drag-request-border {
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
    
    .toggle-icon-container {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: ${props => props.theme.requestTabPanel.dragbar.activeBorder};
      border-radius: 50%;
      cursor: pointer;
      color: ${props => props.theme.requestTabPanel.responseToggle.color};
      top: 50%;
      transform: translateY(-50%);
      z-index: 5;
      opacity: 0;
      transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
      
      &:hover {
        background: ${props => props.theme.requestTabPanel.responseToggle.hoverBg};
        transform: translateY(-50%) scale(1.1);
      }
    }
    
    &:hover .toggle-icon-container {
      opacity: 1;
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
    width: 20px;
    height: 36px;
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
    opacity: 0.8;

    &:hover {
      width: 22px;
      height: 40px;
      background: ${props => props.theme.requestTabPanel.dragbar.activeBorder};
      opacity: 1;
      
      svg {
        transform: scale(1.1);
      }
    }

    svg {
      transition: transform 0.2s ease-in-out;
    }
  }
`;


export default StyledWrapper;
