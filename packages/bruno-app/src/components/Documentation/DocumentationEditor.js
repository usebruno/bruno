import styled from 'styled-components';

const StyledEditor = styled.textarea`
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
`;

const DocumentationEditor = (props) => {
  return <StyledEditor {...props} />;
};

export default DocumentationEditor;
