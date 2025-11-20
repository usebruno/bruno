import styled from 'styled-components';

const StyledWrapper = styled.div`
  .collection-dropdown {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};

    .dropdown-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background-color: ${(props) => props.theme.sidebar.dropdownIcon.hoverBg};
      }
    }

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
