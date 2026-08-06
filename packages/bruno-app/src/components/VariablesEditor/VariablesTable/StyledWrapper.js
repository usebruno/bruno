import styled from 'styled-components';
import { OBJECT_CELL_MAX_HEIGHT } from '../constants';

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

  /*
   * EditableTable pins rows to a fixed 35px and caps any row holding a
   * MultiLineEditor at 3 rows (105px). Object values here are budgeted
   * OBJECT_CELL_MAX_HEIGHT instead, so these override that cap — hence
   * !important against the parent component's own :has() rules.
   */
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
