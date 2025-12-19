import styled from 'styled-components';

const StyledWrapper = styled.div`
  .method-dropdown-text {
    color: ${(props) => props.theme.grpcMethodDropdown.text};
  }

  .service-header {
    background-color: ${(props) => props.theme.grpcMethodDropdown.serviceHeader.bg};
    color: ${(props) => props.theme.grpcMethodDropdown.serviceHeader.text};
  }

  .method-name {
    color: ${(props) => props.theme.grpcMethodDropdown.methodName};
  }

  .method-item {
    &.selected {
      background-color: ${(props) => props.theme.grpcMethodDropdown.selectedBg};
    }

    &:hover:not(.selected) {
      background-color: ${(props) => props.theme.grpcMethodDropdown.hoverBg};
    }

    &.focused {
      background-color: ${(props) => props.theme.grpcMethodDropdown.hoverBg};
    }
  }
`;

export default StyledWrapper;
