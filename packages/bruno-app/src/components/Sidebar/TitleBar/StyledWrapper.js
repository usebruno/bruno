import styled from 'styled-components';

const StyledWrapper = styled.div`
  .local-collection-label {
    background-color: var(--color-sidebar-background);
  }

  .local-collections-unavailable {
    padding: 0.35rem 0.6rem;
    border-top: solid 1px #ddd;
    font-size: 11px;
  }
  .collection-dropdown {
    color: rgb(110 110 110);

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

export const SiteTitle = styled.div`
  color: ${(props) => props.theme.theme['primary-text']};
`;

export default StyledWrapper;
