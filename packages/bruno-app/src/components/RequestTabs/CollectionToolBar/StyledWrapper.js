import styled from 'styled-components';

const StyledWrapper = styled.div`
  .header-container {
    min-height: 47px;
    border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
    
    .action-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      color: ${(props) => props.theme.sidebar.dropdownIcon.color};

      &:hover {
        background-color: ${(props) => props.theme.sidebar.dropdownIcon.hoverBg};
        color: ${(props) => props.theme.sidebar.dropdownIcon.hoverColor || 'inherit'};
      }
    }
  }
`;

export default StyledWrapper;