import styled from 'styled-components';

const StyledWrapper = styled.div`
  .url-bar-container {
    border: 1px solid ${(props) => props.theme.examples.urlBar.border};
  }

  .method {
    color: #fff;
  }

  .method-get {
    background-color: ${(props) => props.theme.request.methods.get};
  }

  .method-post {
    background-color: ${(props) => props.theme.request.methods.post};
  }

  .method-put {
    background-color: ${(props) => props.theme.request.methods.put};
  }

  .method-delete {
    background-color: ${(props) => props.theme.request.methods.delete};
  }

  .method-patch {
    background-color: ${(props) => props.theme.request.methods.patch};
  }

  .method-options {
    background-color: ${(props) => props.theme.request.methods.options};
  }

  .method-head {
    background-color: ${(props) => props.theme.request.methods.head};
  }

  .method-trace {
    background-color: ${(props) => props.theme.request.methods.options};
  }

  .method-connect {
    background-color: ${(props) => props.theme.request.methods.options};
  }

  .method-custom {
    background-color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
