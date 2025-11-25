import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tab-label {
    overflow: hidden;
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100px;
  }

  .close-icon-container {
    height: 20px;
    width: 20px;
    min-width: 20px;
    min-height: 20px;
    border-radius: 4px;

    .close-icon {
      color: ${(props) => props.theme.requestTabs.icon.color};
      width: 8px;
      padding-bottom: 6px;
      padding-top: 6px;
    }

    &:hover,
    &:hover .close-icon {
      color: ${(props) => props.theme.requestTabs.icon.hoverColor};
      background-color: ${(props) => props.theme.requestTabs.icon.hoverBg};
    }

    .has-changes-icon {
      height: 24px;
    }
  }
`;

export default StyledWrapper;
