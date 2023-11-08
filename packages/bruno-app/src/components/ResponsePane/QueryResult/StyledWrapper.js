import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: grid;
  grid-template-columns: 100%;
  grid-template-rows: ${(props) => (props.queryFilterEnabled ? '1.25rem 1fr 2.25rem' : '1.25rem 1fr')};

  /* This is a hack to force Codemirror to use all available space */
  > div {
    position: relative;
  }

  div.CodeMirror {
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
  }

  div[role='tablist'] {
    .active {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .response-filter {
    position: absolute;
    bottom: 0;
    width: 100%;

    input {
      border: ${(props) => props.theme.sidebar.search.border};
      border-radius: 2px;
      background-color: ${(props) => props.theme.sidebar.search.bg};

      &:focus {
        outline: none;
      }
    }
  }
`;

export default StyledWrapper;
