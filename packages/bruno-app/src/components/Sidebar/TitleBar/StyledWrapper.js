import styled from 'styled-components';

const StyledWrapper = styled.div`
  .collection-dropdown {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};

    &:hover {
      color: inherit;
    }

    .tippy-box {
      top: -0.5rem;
      position: relative;
      user-select: none;
    }
  }
  .group {
    border: solid 2px;
    border-color: ${(props) => props.theme.dropdown.bg};
    border-radius: 5px;
    margin-right: 2px;
    display: grid;
  }
  .group-title {
    text-align: center;
  }
`;

export default StyledWrapper;
