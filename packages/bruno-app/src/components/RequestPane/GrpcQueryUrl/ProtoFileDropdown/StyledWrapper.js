import styled from 'styled-components';

const StyledWrapper = styled.div`
  .proto-dropdown-text {
    color: ${(props) => props.theme.grpc.protoFileDropdown.text};
  }

  .proto-dropdown-border {
    border-color: ${(props) => props.theme.grpc.protoFileDropdown.border};
  }

  .proto-dropdown-description {
    color: ${(props) => props.theme.grpc.protoFileDropdown.description};
  }
`;

export default StyledWrapper;
