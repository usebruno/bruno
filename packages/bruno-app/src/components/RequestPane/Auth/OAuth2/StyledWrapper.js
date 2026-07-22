import styled from 'styled-components';

const Wrapper = styled.div`
  label {
    font-size: ${(props) => props.theme.font.size.base};
  }
  .single-line-editor-wrapper {
    max-width: 400px;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
  }

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  .oauth2-section-label {
    color: ${(props) => props.theme.text};
  }
`;

export default Wrapper;
