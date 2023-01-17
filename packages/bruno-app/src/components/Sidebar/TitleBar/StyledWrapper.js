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
`;

export default StyledWrapper;
