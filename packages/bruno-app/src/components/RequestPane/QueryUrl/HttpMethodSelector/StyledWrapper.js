import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.8125rem;

  .dropdown {
    width: 100%;
  }

  .method-selector {
    border-radius: 3px;

    .tippy-box {
      max-width: 150px !important;
      min-width: 110px !important;
    }

    .dropdown-item {
      padding: 0.25rem 0.6rem !important;
      font-weight: 500;
    }
  }

  input {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    outline: none;
    box-shadow: none;
    text-align: left;

    &:focus {
      outline: none !important;
      box-shadow: none !important;
    }
  }

  .method-span {
    width: 70px;
    min-width: 70px;
    max-width: 90px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    display: inline-block;
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
