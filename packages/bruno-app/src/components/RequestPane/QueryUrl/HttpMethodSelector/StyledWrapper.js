import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.8125rem;

  .dropdown {
    width: 100%;
  }

  .method-selector {
    border-radius: 3px;
    min-width: 90px;
    font-weight: 600;
    display: flex;
    align-items: center;

    .tippy-box {
      max-width: 150px !important;
      min-width: 110px !important;
    }

    .dropdown-item {
      padding: 0.25rem 0.6rem !important;
      font-weight: 500;
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }

  #create-new-request-method {
    color: ${(props) => props.theme.request.methods[props.method?.toLowerCase() || 'get']};
  }

  .separator {
    width: 1px;
    height: 16px;
    background-color: #929292;
    margin-right: 8px;
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
`;

export default Wrapper;
