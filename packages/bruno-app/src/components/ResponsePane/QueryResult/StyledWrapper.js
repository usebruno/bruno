import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;

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

  .react-pdf__Page {
    margin-top: 10px;
    background-color: transparent !important;
  }
  .react-pdf__Page__textContent {
    border: 1px solid darkgrey;
    box-shadow: 5px 5px 5px 1px #ccc;
    border-radius: 0px;
    margin: 0 auto;
  }
  .react-pdf__Page__canvas {
    margin: 0 auto;
  }
  div[role='tablist'] {
    .active {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .response-filter {
    position: absolute;
    bottom: 0;
    width: 100%;

    input {
      border: solid 1px ${(props) => props.theme.border.border2};
      border-radius: ${(props) => props.theme.border.radius.sm};
      background-color: ${(props) => props.theme.background.base};

      &:focus {
        outline: none;
      }
    }

    .jq-error {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 4px;
      padding: 2px 8px;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.danger};
      background-color: ${(props) => props.theme.background.base};
      border: solid 1px ${(props) => props.theme.colors.text.danger};
      border-radius: ${(props) => props.theme.border.radius.sm};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .filter-type-toggle {
      flex-shrink: 0;

      .toggle-btn {
        font-size: 11px;
        padding: 2px 8px;
        border: solid 1px ${(props) => props.theme.border.border2};
        background-color: ${(props) => props.theme.background.mantle};
        color: ${(props) => props.theme.colors.text.muted};
        cursor: pointer;
        white-space: nowrap;

        &:first-child {
          border-radius: 4px 0 0 4px;
        }

        &:last-child {
          border-radius: 0 4px 4px 0;
          margin-left: -1px;
        }

        &.active {
          background-color: ${(props) => props.theme.background.base};
          color: ${(props) => props.theme.colors.text.yellow};
          border-color: ${(props) => props.theme.colors.text.yellow};
          font-weight: 600;
          position: relative;
          z-index: 1;
        }
      }
    }
  }
`;

export default StyledWrapper;
