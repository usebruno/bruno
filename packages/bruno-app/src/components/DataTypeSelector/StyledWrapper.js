import styled from 'styled-components';

const StyledWrapper = styled.div`
  .type-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
    display: inline-block;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .caret-icon {
    opacity: 0.7;
  }
`;

export default StyledWrapper;
