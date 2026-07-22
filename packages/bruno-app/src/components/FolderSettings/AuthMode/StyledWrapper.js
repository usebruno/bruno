import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};

  .auth-mode-selector {
    background: transparent;

    .auth-mode-label {
      color: ${(props) => props.theme.primary.text};

    .caret {
      color: rgb(140, 140, 140);
      fill: rgb(140, 140, 140);
    }
  }
}
`;

export default StyledWrapper;
