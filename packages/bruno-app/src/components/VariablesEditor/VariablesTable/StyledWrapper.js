import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;

  .table-container {
    min-height: 0;
  }

  /*
   * TableVirtuoso sticks thead to the shared scroll parent. That leaves the
   * table's top border floating above the header while scrolling. Variables
   * tables are short sections in a longer page — headers should scroll away.
   */
  .table-container thead,
  .table-container thead tr {
    position: static !important;
    top: auto !important;
  }

  /* Show eye/copy only while the whole row is hovered (or an action is focused) */
  .table-container tbody tr:hover .row-actions,
  .table-container tbody tr:focus-within .row-actions {
    opacity: 1;
    pointer-events: auto;
  }
`;

export default StyledWrapper;
