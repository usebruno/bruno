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

  .table-container tbody td:has(.value-editor.is-multiline) {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    white-space: normal !important;
    text-overflow: clip !important;
    vertical-align: top;

    > div:not(.drag-handle) {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
  }
`;

export default StyledWrapper;
