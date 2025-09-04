import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.6875rem;
  display: flex;
  align-self: stretch;
  align-items: center;
  min-width: 34px;
  flex-shrink: 0;

  span {
    position: relative;
    top: 1px;
  }

  .method-get {
    color: ${(props) => props.theme.request.methods.get};
  }
  .method-post {
    color: ${(props) => props.theme.request.methods.post};
  }
  .method-put {
    color: ${(props) => props.theme.request.methods.put};
  }
  .method-delete {
    color: ${(props) => props.theme.request.methods.delete};
  }
  .method-patch {
    color: ${(props) => props.theme.request.methods.patch};
  }
  .method-options {
    color: ${(props) => props.theme.request.methods.options};
  }
  .method-head {
    color: ${(props) => props.theme.request.methods.head};
  }
  .method-grpc {
    color: ${(props) => props.theme.request.grpc};
  }
  .method-ws {
    color: ${(props) => props.theme.request.ws};
  }
`;

export default Wrapper;
