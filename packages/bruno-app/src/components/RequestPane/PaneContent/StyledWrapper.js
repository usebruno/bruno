import styled from 'styled-components';

const StyledWrapper = styled.section`
  display: grid;
  grid-template-columns: 100%;
  grid-template-rows: 1.25rem calc(100% - 1.25rem);
  height: 100%;
  width: 100%;

  .head {
    display: flex;
    padding-top: 2px;

    .active {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  /* This ensures the content ALWAYS stays inside the container and is only overflowing in the container */
  .content {
    position: relative;
  }
  .content-inner {
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
    overflow: auto;
  }

  /* This is a hack to force Codemirror to use all available space */
  .content.code-mirror-full div.CodeMirror {
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
  }
`;

export default StyledWrapper;
