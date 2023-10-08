import styled from 'styled-components';

const StyledContentWrapper = styled.div`
  height: calc(100vh - 100px);
  margin-right: 5px;
  margin-left: 5px;

  background-color: ${(props) => props.theme.rightPane.bg};

  .text-end {
    text-align: end;
  }

  ::-webkit-scrollbar {
    width: 0px;
  }

  ::-webkit-scrollbar-button {
    display: none;
  }

  textarea {
    height: inherit;
    background: ${(props) => props.theme.bg};
    color: ${(props) => props.theme.text};
    border: solid 1px ${(props) => props.theme.modal.input.border};
    padding: 1em;
    resize: none;

    &:focus,
    &:active,
    &:focus-within,
    &:focus-visible,
    &:target {
      border: solid 1px ${(props) => props.theme.modal.input.focusBorder} !important;
      outline: ${(props) => props.theme.modal.input.focusBorder} !important;
    }

    ::-webkit-scrollbar {
      width: 0px;
    }

    ::-webkit-scrollbar-button {
      display: none;
    }
  }
`;

export default StyledContentWrapper;
