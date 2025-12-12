import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  /* Default: show dropdown, hide buttons */
  .actions-dropdown {
    display: flex;
  }

  .actions-buttons {
    display: none;
  }

  /* When right side is expandible, show buttons and hide dropdown */
  [data-right-side-expandible="true"] & {
    .actions-dropdown {
      display: none;
    }

    .actions-buttons {
      display: flex;
      align-items: center;
      gap: 2px;
    }
  }
`;

export default StyledWrapper;
