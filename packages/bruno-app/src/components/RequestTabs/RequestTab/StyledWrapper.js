import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;

  .tab-label {
    overflow: hidden;
  }

  .tab-method {
    font-size: ${(props) => props.theme.font.size.base};
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }

  .close-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 20px;
    min-width: 24px;
    margin-left: 4px;
    border-radius: 3px;

    .close-icon {
      display: none;
      color: ${(props) => props.theme.requestTabs.icon.color};
      width: 8px;
      padding-bottom: 6px;
      padding-top: 6px;
    }

    &:hover {
      background-color: ${(props) => props.theme.requestTabs.icon.hoverBg};
    }

    &:hover .close-icon {
      color: ${(props) => props.theme.requestTabs.icon.hoverColor};
    }

    .has-changes-icon {
      height: 24px;
    }
  }

  .request-tab:hover & .close-icon-container .close-icon {
    display: block;
  }

  .request-tab.active & .close-icon-container .close-icon {
    display: block;
  }

  /**
   * Request tab specific styles
   */
  .request-tab & .tab-name {
    text-overflow: clip;
  }

  .request-tab & .tab-name::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: 100%;
    background: linear-gradient(to right, transparent, ${(props) => props.theme.requestTabs.bg});
    pointer-events: none;
  }

  .request-tab.active & .tab-name::after {
    background: linear-gradient(to right, transparent, ${(props) => props.theme.requestTabs.active.bg});
  }
`;

export default StyledWrapper;
