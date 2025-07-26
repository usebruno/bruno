import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tab-panel-selector {
    border: 1px solid ${(props) => props.theme.dropdown.border};
    border-radius: 3px;
    background-color: ${(props) => props.theme.dropdown.bg};
    color: ${(props) => props.theme.dropdown.color};
    font-size: 0.8125rem;
    height: 30px;
    min-width: 80px;
  }

  .dropdown-item {
    cursor: pointer;
    font-size: 0.8125rem;
    color: ${(props) => props.theme.dropdown.color};

    &:hover {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }
  }
`;

export default StyledWrapper;
