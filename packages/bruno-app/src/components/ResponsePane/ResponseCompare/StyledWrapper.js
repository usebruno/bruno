import styled from 'styled-components';

const StyledWrapper = styled.div`
  .response-select {
    background: rgb(51, 51, 51);
    color: white;
    border: 1px solid rgb(64, 64, 64);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 13px;
    outline: none;
    min-width: 300px;

    &:hover {
      background: rgb(64, 64, 64);
    }

    option {
      background: rgb(51, 51, 51);
      color: white;
    }
  }

  .toggle-group {
    display: flex;
    gap: 1px;
    background: rgb(51, 51, 51);
    padding: 1px;
    border-radius: 4px;

    button {
      background: rgb(51, 51, 51);
      color: white;
      border: none;
      padding: 4px 12px;
      font-size: 13px;
      cursor: pointer;

      &:hover {
        background: rgb(64, 64, 64);
      }

      &.active {
        background: rgb(64, 64, 64);
      }

      &:first-child {
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
      }

      &:last-child {
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
      }
    }
  }

  .CodeMirror {
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    font-family: inherit;
    border: none;
  }

  .CodeMirror-scroll {
    overflow: auto;
  }

  .CodeMirror-gutters {
    border-right: none;
  }

  .CodeMirror-wrap {
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .CodeMirror-scroll {
    height: 100% !important;
    overflow: auto !important;
    position: relative;
    outline: none;
  }

  .CodeMirror-sizer {
    min-height: 0 !important;
  }

  .CodeMirror-linenumber {
    color: ${({ theme }) => theme.colors.textLight};
  }

  .diff-highlight {
    background-color: ${({ theme }) => theme.colors.highlight};
  }

  select {
    appearance: none;
    background: #1e1e1e;
    border: 1px solid #333;
    color: #e1e1e1;
    font-size: 13px;
    min-width: 240px;
    padding: 6px 28px 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 16px;

    &:hover {
      background-color: #2a2a2a;
      border-color: #444;
    }

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
      box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
    }

    option {
      background: #1e1e1e;
      color: #e1e1e1;
      padding: 8px 12px;

      &:hover {
        background: #2a2a2a;
      }
    }
  }

  /* Hide the overlay scrollbar since we're using native scrollbar */
  .CodeMirror-overlayscroll-horizontal,
  .CodeMirror-overlayscroll-vertical {
    display: none !important;
  }

  /* Style the native scrollbar */
  .CodeMirror-scroll {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.colors.scrollbar} transparent;

    &::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: ${({ theme }) => theme.colors.scrollbar};
      border-radius: 4px;
    }
  }

  /* Ensure proper sizing for the code container */
  .CodeMirror-code {
    width: fit-content;
    min-width: 100%;
  }
`;

export default StyledWrapper; 