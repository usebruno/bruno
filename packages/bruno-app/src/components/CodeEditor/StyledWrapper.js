import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    background: ${(props) => props.theme.codemirror.bg};
    border: solid 1px ${(props) => props.theme.codemirror.border};
    font-family: ${(props) => (props.font ? props.font : 'default')};
    font-size: ${(props) => (props.fontSize ? `${props.fontSize}px` : 'inherit')};
    line-break: anywhere;
    flex: 1 1 0;
    
    &.dialog-opened {
      padding-top: 40px;
    }
  }

  /* Removes the glow outline around the folded json */
  .CodeMirror-foldmarker {
    text-shadow: none;
    color: ${(props) => props.theme.textLink};
    background: none;
    padding: 0;
    margin: 0;
  }

  .CodeMirror-overlayscroll-horizontal div,
  .CodeMirror-overlayscroll-vertical div {
    background: #d2d7db;
  }

  /* Search Dialog Styling */
  .CodeMirror-dialog {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 15;
    background: ${props => props.theme.background || '#f4f4f4'};
    border-bottom: 1px solid ${props => props.theme.border || '#e0e0e0'};
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    padding: 8px;
    gap: 8px;
    height: 40px;
    box-sizing: border-box;
  }

  /* Search Label and Hint */
  .CodeMirror-search-label {
    display: none;
  }

  .CodeMirror-dialog-top .CodeMirror-search-hint {
    position: relative;
    z-index: 16;
    display: inline-block;
    color: ${props => props.theme.textSecondary || '#666'};
    font-size: 11px;
    margin-left: 4px;
  }

  .CodeMirror-scroll {
    margin-top: 0;
  }
  
  /* Search Input */
  .CodeMirror-search-field {
    flex-grow: 1;
    padding: 6px 8px;
    border: 1px solid ${props => props.theme.inputBorder || '#d0d0d0'};
    border-radius: 4px;
    background: ${props => props.theme.inputBackground || 'white'};
    color: ${props => props.theme.text || 'black'};
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: ${props => props.theme.primary || '#0066cc'};
      box-shadow: 0 0 0 2px rgba(0,102,204,0.2);
    }
  }

  /* Results Count */
  #search-results-count {
    font-size: 0.9em;
    color: ${props => props.theme.textMuted || '#888'};
    margin-left: 8px;
    white-space: nowrap;
  }

  textarea.cm-editor {
    position: relative;
  }

  /* Dark Mode Styles */
  .CodeMirror.cm-s-monokai {
    .CodeMirror-dialog {
      background: #2d2d2d;
      border-color: #444;

      .CodeMirror-search-field {
        background: #3c3c3c;
        border-color: #555;
        color: #f0f0f0;

        &:focus {
          border-color: #5a9bd1;
          box-shadow: 0 0 0 2px rgba(90,155,209,0.2);
        }
      }

      .CodeMirror-search-hint {
        color: #bbb;
      }
    }

    .CodeMirror-overlayscroll-horizontal div,
    .CodeMirror-overlayscroll-vertical div {
      background: #444444;
    }
  }

  .cm-s-monokai span.cm-property,
  .cm-s-monokai span.cm-attribute {
    color: #9cdcfe !important;
  }

  .cm-s-monokai span.cm-string {
    color: #ce9178 !important;
  }

  .cm-s-monokai span.cm-number {
    color: #b5cea8 !important;
  }

  .cm-s-monokai span.cm-atom {
    color: #569cd6 !important;
  }

  .cm-variable-valid {
    color: green;
  }
  .cm-variable-invalid {
    color: red;
  }

  .CodeMirror-search-hint {
    display: inline;
  }

  .cm-s-default span.cm-property {
    color: #1f61a0 !important;
  }

  .cm-s-default span.cm-variable {
    color: #397d13 !important;
  }
`;

export default StyledWrapper;
