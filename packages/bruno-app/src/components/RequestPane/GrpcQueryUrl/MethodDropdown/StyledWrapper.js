import styled from 'styled-components';

const StyledWrapper = styled.div`
  .method-dropdown-text {
    color: ${(props) => props.theme.grpc.methodDropdown.text};
  }

  .service-header {
    background-color: ${(props) => props.theme.grpc.methodDropdown.serviceHeader.bg};
    color: ${(props) => props.theme.grpc.methodDropdown.serviceHeader.text};
  }

  .method-name {
    color: ${(props) => props.theme.grpc.methodDropdown.methodName};
  }

  .method-item {
    &.selected {
      background-color: ${(props) => props.theme.grpc.methodDropdown.selectedBg};
    }

    &:hover:not(.selected) {
      background-color: ${(props) => props.theme.grpc.methodDropdown.hoverBg};
    }

    &.focused {
      background-color: ${(props) => props.theme.grpc.methodDropdown.hoverBg};
    }
  }
`;

export default StyledWrapper;
