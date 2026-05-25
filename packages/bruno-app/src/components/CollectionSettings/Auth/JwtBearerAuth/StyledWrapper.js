import styled from 'styled-components';

const Wrapper = styled.div`
  label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .single-line-editor-wrapper {
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
  }

  select.jwt-algorithm-select,
  select.jwt-row-type-select {
    background-color: ${(props) => props.theme.input.bg};
    border: solid 1px ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-size: ${(props) => props.theme.font.size.sm};

    &:focus {
      outline: none;
      box-shadow: none;
    }
  }

  select.jwt-row-type-select {
    width: 100%;
  }

  .payload-parse-error {
    color: ${(props) => props.theme.colors?.text?.danger || '#c0392b'};
  }

  .jwt-payload-json-view {
    margin: 0;
    padding: 0.6rem 0.8rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    font-family: ${(props) => props.theme.font.codeFont || 'monospace'};
    font-size: ${(props) => props.theme.font.size.sm};
    white-space: pre-wrap;
    overflow-x: auto;
  }
`;

export default Wrapper;
