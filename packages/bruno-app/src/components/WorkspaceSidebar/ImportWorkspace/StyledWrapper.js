import styled from 'styled-components';

const StyledWrapper = styled.div`
  .selected-file-container {
    border: 1px solid ${(props) => props.theme.importModal.selectedFile.border};
    background-color: ${(props) => props.theme.importModal.selectedFile.bg};
  }

  .selected-file-name {
    color: ${(props) => props.theme.importModal.selectedFile.text};
  }

  .drag-drop-zone {
    border: 2px dashed ${(props) => props.theme.importModal.dragZone.border};
    transition: all 0.2s ease;

    &.active {
      border-color: ${(props) => props.theme.importModal.dragZone.activeBorder};
      background-color: ${(props) => props.theme.importModal.dragZone.activeBg};
    }
  }

  .import-icon {
    color: ${(props) => props.theme.importModal.icon};
  }

  .import-text {
    color: ${(props) => props.theme.importModal.text};
  }

  .import-description {
    color: ${(props) => props.theme.importModal.description};
  }
`;

export default StyledWrapper;
