import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Rows share column tracks (subgrid) so shortcuts line up past the longest label in the menu. */
  [role="menu"].has-shortcuts {
    display: grid;
    grid-template-columns: auto 1fr auto;
    column-gap: 0.5rem;

    > *,
    .dropdown-item {
      grid-column: 1 / -1;
    }

    .submenu-trigger,
    .dropdown-item {
      display: grid;
      grid-template-columns: subgrid;
    }

    .dropdown-label {
      grid-column: 2;
    }

    .dropdown-label:first-child {
      grid-column: 1 / 3;
    }

    .dropdown-shortcut,
    .dropdown-right-section,
    .submenu-arrow {
      grid-column: 3;
    }

    .dropdown-shortcut {
      justify-self: end;
      margin-left: 1rem;
      font-family: inherit;
      font-size: 11px;
      color: ${(props) => props.theme.dropdown.mutedText};
    }
  }
`;

export default StyledWrapper;
