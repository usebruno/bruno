import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;

  .table-container {
    min-height: 0;
  }

  .table-container thead,
  .table-container thead tr {
    position: static !important;
    top: auto !important;
  }

  .table-container tbody tr:hover .row-action-btn {
    opacity: 1;
    pointer-events: auto;
  }
`;

export default StyledWrapper;
