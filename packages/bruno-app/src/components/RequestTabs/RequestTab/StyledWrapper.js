import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tab-label {
    overflow: hidden;
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close-icon-container {
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

    &:hover,
    &:hover .close-icon {
      color: ${(props) => props.theme.requestTabs.icon.hoverColor};
      background-color: ${(props) => props.theme.requestTabs.icon.hoverBg};
    }

    .has-changes-icon {
      height: 24px;
    }

    .tab-method {
      font-size: ${(props) => props.theme.font.size.sm};
    }
  }
`;

export default StyledWrapper;
