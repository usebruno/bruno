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

  /* When any parent has class 'vertical-layout', show buttons and hide dropdown */
  .vertical-layout & {
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
