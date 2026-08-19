import styled from 'styled-components';
import { OBJECT_CELL_MAX_HEIGHT } from '../constants';

const StyledWrapper = styled.div`
  width: 100%;

  .table-container {
    min-height: 0;
  }

  .table-container tbody tr:hover .row-action-btn {
    opacity: 1;
    pointer-events: auto;
  }

  .table-container tbody td:has(.value-editor.is-multiline) {
    height: auto !important;
    max-height: ${OBJECT_CELL_MAX_HEIGHT} !important;
    overflow: hidden !important;
    white-space: normal !important;
    text-overflow: clip !important;
    vertical-align: top;

    > div:not(.drag-handle) {
      height: auto !important;
      max-height: ${OBJECT_CELL_MAX_HEIGHT} !important;
      overflow: hidden !important;
    }
  }

  .table-container tbody tr:has(.value-editor.is-multiline) {
    height: auto !important;
    max-height: none !important;
  }
`;

export default StyledWrapper;
