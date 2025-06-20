import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  color: white;

  .editing-mode {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .docs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: #222;
    border-bottom: 1px solid #333;
    color: white;
    font-size: 16px;
    font-weight: 500;

    .close-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      width: 24px;
      height: 24px;
      border-radius: 3px;
      color: white;
      cursor: pointer;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  .docs-footer {
    display: flex;
    justify-content: flex-end;
    padding: 12px 16px;
    background-color: #222;
    border-top: 1px solid #333;

    .save-button {
      background-color: #3d81df;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #2d71cf;
      }
    }
  }

  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    
    .CodeMirror {
      height: 100%;
      font-family: monospace;
      background-color: #1e1e1e;
      color: #d4d4d4;
      
      .CodeMirror-gutters {
        background-color: #1e1e1e;
        border-right: 1px solid #333;
      }
      
      .CodeMirror-linenumber {
        color: #858585;
      }
    }
  }

  .markdown-container {
    line-height: 1.5;
    padding: 16px;
    color: #d4d4d4;
  }
`;

export default StyledWrapper;
