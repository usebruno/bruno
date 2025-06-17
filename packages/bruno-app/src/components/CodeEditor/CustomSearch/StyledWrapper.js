import styled from 'styled-components';

const StyledWrapper = styled.div`
  .bruno-search-bar {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 20;
    display: flex;
    align-items: center;
    padding: 1px 4px;
    min-height: 26px;
    background: ${(props) => props.theme.sidebar.search.bg} !important;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.sidebar.search.bg} !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .bruno-search-bar input {
    min-width: 120px;
    background: transparent;
    color: inherit;
    border: none;
    outline: none;
    padding: 2px 4px;
  }

  .searchbar-icon-btn {
    background: none;
    border: none;
    padding: 1px;
    cursor: pointer;
    color: #aaa;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    width: 24px;
  }

  .searchbar-icon-btn.active {
    color: #f39c12;
  }

  .searchbar-result-count {
    min-width: 60px;
    text-align: center;
    font-size: 13px;
    color: #aaa;
  }

  .bruno-search-bar.compact {
    background: ${(props) => props.theme.codemirror.bg};
    color: ${(props) => props.theme.codemirror.text || props.theme.text};
    border: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-radius: 4px;
    padding: 2px 6px;
    min-height: 32px;
    display: flex;
    align-items: center;
    gap: 0;
  }

  .bruno-search-bar input {
    background: transparent;
    color: inherit;
    border: none;
    outline: none;
    font-size: 14px;
    padding: 2px 4px;
    min-width: 120px;
  }

  .searchbar-icon-btn {
    background: none;
    border: none;
    padding: 1px;
    margin-left: 1px;
    cursor: pointer;
    color: #aaa;
    border-radius: 3px;
    transition: background 0.15s, color 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    width: 24px;
  }

  .searchbar-icon-btn:focus {
    outline: 1px solid ${(props) => props.theme.codemirror.border};
  }

  .bruno-search-bar, .bruno-search-bar input {
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  }

  .cm-search-line-highlight {
    background: ${(props) => props.theme.codemirror.searchLineHighlightCurrent};
  }

  .cm-search-match {
    background: ${(props) => props.theme.codemirror.searchMatch};
  }

  .cm-search-current {
    background: ${(props) => props.theme.codemirror.searchMatchActive};
  }
`;

export default StyledWrapper;