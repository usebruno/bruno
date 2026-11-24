import styled from 'styled-components';

const Wrapper = styled.div`
  flex-shrink: 0;
  font-size: ${(props) => props.theme.font.size.base};

  .auth-mode-selector {
    font-size: ${(props) => props.theme.font.size.sm};
    padding: 0.2rem 0px;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};

    .auth-mode-label {
      color: ${(props) => props.theme.primary.text};
      padding: 0 0.5rem;

      .caret {
        color: ${(props) => props.theme.colors.text.muted};
        fill: ${(props) => props.theme.colors.text.muted};
      }
    }
  }
`;

export default Wrapper;
