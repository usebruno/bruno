import styled from 'styled-components';

const StyledWrapper = styled.div`
  .import-zone {
    background-color: ${(props) => props.theme.importEnvironmentModal.zone.bg};
    border: 2px dashed ${(props) => props.theme.importEnvironmentModal.zone.border};
    transition: all 0.2s ease;

    &.drag-over {
      border-color: ${(props) => props.theme.importEnvironmentModal.zone.dragOverBorder};
      background-color: ${(props) => props.theme.importEnvironmentModal.zone.dragOverBg};
    }

    &:hover:not(.drag-over) {
      border-color: ${(props) => props.theme.importEnvironmentModal.zone.hoverBorder};
    }
  }
`;

export default StyledWrapper;
