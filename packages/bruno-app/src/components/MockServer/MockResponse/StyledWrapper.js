import styled from 'styled-components';

const StyledWrapper = styled.div`
  .top-bar {
    border-bottom: 1px solid ${(props) => props.theme.table.border};
    padding-bottom: 12px;
  }

  .textbox,
  .method-select,
  .rule-input {
    line-height: 1.42857143;
    padding: 0.45rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.input.color || 'inherit'};
    outline: none;
    box-shadow: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
      outline: none;
    }

    &:disabled,
    &[readOnly] {
      opacity: 0.8;
    }
  }

  .url-bar-container {
    border: 1px solid ${(props) => props.theme.examples.urlBar.border};
    background: ${(props) => props.theme.input.bg};
  }

  .method-select {
    min-width: 88px;
    height: 28px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .method {
    min-width: 72px;
    color: #fff;
  }

  .method-get { background-color: ${(props) => props.theme.request.methods.get}; }
  .method-post { background-color: ${(props) => props.theme.request.methods.post}; }
  .method-put { background-color: ${(props) => props.theme.request.methods.put}; }
  .method-patch { background-color: ${(props) => props.theme.request.methods.patch}; }
  .method-delete { background-color: ${(props) => props.theme.request.methods.delete}; }

  .editor-section {
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    min-height: 320px;
    height: calc(100% - 56px);
    background: ${(props) => props.theme.input.bg};
  }
`;

export default StyledWrapper;
