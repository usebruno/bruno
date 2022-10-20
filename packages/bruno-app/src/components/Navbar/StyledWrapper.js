import styled from 'styled-components';

const StyledWrapper = styled.div`
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

export default StyledWrapper;
