import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};
  white-space: nowrap;

  .body-mode-selector {
    background: transparent;
    border-radius: 3px;

    .selected-body-mode {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140, 140, 140);
  }
`;

export default Wrapper;
