import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .diff-viewer-container {
    flex: 1;
    overflow: auto;
    padding: 16px;
    border-radius: 4px;
    background: ${props => props.theme.colors.background};
  }

  .d2h-wrapper {
    margin: 0;
    height: 100%;
  }

  .d2h-file-wrapper {
    border: none;
    margin: 0;
  }

  .d2h-diff-table {
    font-family: Monaco, Consolas, monospace;
    font-size: 12px;
    width: 100%;
  }

  .d2h-code-line {
    padding: 4px 8px;
  }

  .d2h-code-side-line {
    padding: 4px 8px;
  }

  .d2h-code-line-prefix {
    display: inline-block;
    width: 20px;
  }

  .d2h-code-line-ctn {
    display: inline-block;
  }

  /* Hide unchanged lines */
  .d2h-info {
    display: none;
  }

  .d2h-file-header, .d2h-file-list {
    display: none;
  }

  .d2h-file-diff {
    overflow-x: auto;
  }

  .d2h-diff-table {
    .d2h-diff-tbody {
      > tr {
        background-color: white !important;
      }
      > tr.d2h-ins {
        background-color: ${props => props.theme.colors.diff.add.background} !important;
      }
      > tr.d2h-del {
        background-color: ${props => props.theme.colors.diff.delete.background} !important;
      }
    }
  }

  /* Remove the hide unchanged lines style */
  .d2h-diff-table {
    .d2h-diff-tbody {
      > tr:not(.d2h-ins):not(.d2h-del):not(.d2h-info) {
        /* display: none; <- Remove this */
        background-color: white !important;
      }
    }
  }

  /* Adjust dark theme if needed */
  ${props => props.theme.displayedTheme === 'dark' && `
    .d2h-diff-table .d2h-diff-tbody > tr {
      background-color: #1e1e1e !important;
    }
  `}

  /* Styles for added lines */
  .d2h-ins {
    background-color: ${props => props.theme.colors.diff.add.background} !important;
    border-color: ${props => props.theme.displayedTheme === 'dark' ? 'transparent' : props.theme.colors.diff.add.border};

    .d2h-code-line-prefix {
      background-color: ${props => props.theme.colors.diff.add.gutter};
    }
  }

  /* Styles for removed lines */
  .d2h-del {
    background-color: ${props => props.theme.colors.diff.delete.background} !important;
    border-color: ${props => props.theme.displayedTheme === 'dark' ? 'transparent' : props.theme.colors.diff.delete.border};

    .d2h-code-line-prefix {
      background-color: ${props => props.theme.colors.diff.delete.gutter};
    }
  }

  /* No differences message */
  .no-diff {
    padding: 16px;
    text-align: center;
    color: ${props => props.theme.displayedTheme === 'dark' ? '#ccc' : '#666'};
  }
`;

export default StyledWrapper;

