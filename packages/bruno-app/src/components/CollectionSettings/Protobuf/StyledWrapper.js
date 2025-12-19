import styled from 'styled-components';

const StyledWrapper = styled.div`
  .available-certificates {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};

    button.remove-certificate {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .protobuf-error-message {
    color: ${(props) => props.theme.protobuf.errorMessage};
  }

  .protobuf-table-header {
    color: ${(props) => props.theme.protobuf.table.headerText};
    border-color: ${(props) => props.theme.protobuf.table.border};
  }

  .protobuf-table-cell {
    border-color: ${(props) => props.theme.protobuf.table.border};
  }

  .protobuf-empty-message {
    color: ${(props) => props.theme.protobuf.emptyMessage};
  }

  .protobuf-file-icon {
    color: ${(props) => props.theme.protobuf.fileIcon};
  }

  .protobuf-file-name {
    color: ${(props) => props.theme.protobuf.fileName};
  }

  .protobuf-file-path {
    color: ${(props) => props.theme.protobuf.filePath};
  }

  .protobuf-invalid-icon {
    color: ${(props) => props.theme.protobuf.invalidIcon};
  }

  .protobuf-replace-button {
    color: ${(props) => props.theme.protobuf.replaceButton.color};
    
    &:hover {
      color: ${(props) => props.theme.protobuf.replaceButton.hoverColor};
    }
  }

  .protobuf-remove-button {
    color: ${(props) => props.theme.protobuf.removeButton.color};
    
    &:hover {
      color: ${(props) => props.theme.protobuf.removeButton.hoverColor};
    }
  }

  .protobuf-checkbox {
    border-color: ${(props) => props.theme.protobuf.checkbox.border};
  }
`;

export default StyledWrapper;
