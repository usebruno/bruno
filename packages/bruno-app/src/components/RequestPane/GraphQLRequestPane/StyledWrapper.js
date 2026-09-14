import styled from 'styled-components';

const StyledWrapper = styled.div`
  .variables-section {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .variables-header {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 3px 10px;
    cursor: pointer;
    user-select: none;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted};
    gap: 4px;
    flex-shrink: 0;
    background: none;
    border: none;
    outline: none;

    &:hover {
      color: ${(props) => props.theme.text};
    }

    .variables-chevron {
      display: flex;
      align-items: center;
      opacity: 0.6;
    }
  }

  .variables-dragbar {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 10px;
    cursor: row-resize;
    flex-shrink: 0;
    position: relative;

    &::after {
      content: '';
      display: block;
      width: 100%;
      height: 1px;
      border-top: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
    }

    &:hover::after {
      border-top: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }

  div.graphql-query-builder-container {
    height: 100%;
    flex-shrink: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  div.query-builder-dragbar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    min-width: 10px;
    cursor: col-resize;
    background: transparent;
    position: relative;
    flex-shrink: 0;

    &::after {
      content: '';
      display: block;
      height: 100%;
      width: 1px;
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
    }

    &:hover::after {
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }

`;

export default StyledWrapper;
