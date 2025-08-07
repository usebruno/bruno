import styled from 'styled-components';

const StyledWrapper = styled.div`
  .bruno-search-bar {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 20;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    padding: 0 2px;
    min-height: 36px;
    background: ${(props) => props.theme.sidebar.search.bg} !important;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.sidebar.search.bg} !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    width: auto;
    min-width: 180px;
    max-width: 320px;
  }

  .bruno-search-bar input {
    min-width: 80px;
    background: transparent;
    color: inherit;
    border: none;
    outline: none;
    padding: 1px 2px;
    font-size: 13px;
    margin: 0 1px;
    height: 28px;
  }

  .searchbar-icon-btn {
    background: none;
    border: none;
    padding: 0 1px;
    margin: 0 1px;
    cursor: pointer;
    color: #aaa;
    border-radius: 3px;
    height: 18px;
    width: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .searchbar-result-count {
    min-width: 28px;
    text-align: center;
    font-size: 11px;
    color: #aaa;
    margin: 0 8px 0 1px; 
    white-space: nowrap;
  }

  .bruno-search-bar.compact {
    background: ${(props) => props.theme.codemirror.bg};
    color: ${(props) => props.theme.codemirror.text || props.theme.text};
    border: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-radius: 4px;
    padding: 1px 3px;
    min-height: 22px;
    display: flex;
    align-items: center;
    gap: 0;
  }

  .bruno-search-bar input {
    background: transparent;
    color: inherit;
    border: none;
    outline: none;
    font-size: 13px;
    padding: 1px 2px;
    min-width: 80px;
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

  .searchbar-icon-btn.active {
    color: #f39c12 !important;
  }
`;

export default StyledWrapper;