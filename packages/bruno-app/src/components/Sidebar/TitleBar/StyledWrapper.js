import styled from 'styled-components';

const StyledWrapper = styled.div`
  .local-collections-unavailable {
    padding: 0.35rem 0.6rem;
    color: ${(props) => props.theme.sidebar.muted};
    border-top: solid 1px ${(props) => props.theme.dropdown.seperator};
    font-size: 11px;
  }
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
