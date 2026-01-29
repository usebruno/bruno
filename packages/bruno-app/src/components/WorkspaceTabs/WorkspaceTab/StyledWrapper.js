import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  .tab-label {
    overflow: hidden;
    align-items: center;
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .tab-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    margin-right: 6px;
    color: ${(props) => props.theme.requestTabs.color};
  }

  .tab-name {
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    font-size: 0.8125rem;
    padding-right: 2px;
  }

  .close-icon {
    margin-left: 6px;
    padding: 2px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s, background-color 0.15s;

    &:hover {
      background-color: ${(props) => props.theme.requestTabs.closeIconHoverBg || 'rgba(0, 0, 0, 0.1)'};
    }

    svg {
      width: 14px;
      height: 14px;
    }
  }

  &:hover .close-icon {
    opacity: 1;
  }

  &.permanent .close-icon {
    display: none;
  }
`;

export default StyledWrapper;
