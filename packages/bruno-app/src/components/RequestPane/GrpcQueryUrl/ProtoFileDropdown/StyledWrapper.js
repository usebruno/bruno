import styled from 'styled-components';

const StyledWrapper = styled.div`
  .proto-dropdown-text {
    color: ${(props) => props.theme.grpcProtoFileDropdown.text};
  }

  .proto-dropdown-border {
    border-color: ${(props) => props.theme.grpcProtoFileDropdown.border};
  }

  .proto-dropdown-description {
    color: ${(props) => props.theme.grpcProtoFileDropdown.description};
  }
`;

export default StyledWrapper;
