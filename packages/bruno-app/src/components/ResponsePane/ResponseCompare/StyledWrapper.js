import styled from 'styled-components';

const StyledWrapper = styled.div`
  .CodeMirror {
    height: 100%;
    min-height: 200px;
    font-size: 13px;
    line-height: 1.5;
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.codemirror.bg};
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .CodeMirror-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto !important;
  }

  .CodeMirror-gutters {
    background: ${({ theme }) => theme.codemirror.bg};
    border-right: 1px solid ${({ theme }) => theme.colors.border};
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

  .toggle-group {
    display: inline-flex;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
    padding: 2px;

    button {
      border: none;
      background: transparent;
      color: ${({ theme }) => theme.colors.text};
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 3px;
      transition: all 0.2s;

      &:hover {
        background: ${({ theme }) => theme.colors.hover};
      }

      &.active {
        background: ${({ theme }) => theme.colors.primary};
        color: white;
      }
    }
  }

  /* Hide the overlay scrollbar since we're using native scrollbar */
  .CodeMirror-overlayscroll-horizontal,
  .CodeMirror-overlayscroll-vertical {
    display: none;
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
`;

export default StyledWrapper; 