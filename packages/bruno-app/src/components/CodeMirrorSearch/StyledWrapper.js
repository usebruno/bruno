import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .bruno-search-bar {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 20;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    padding: 4px 4px;
    gap: 4px;
    width: auto;
    background: ${(props) => props.theme.background.base};
    color: ${(props) => props.theme.text.base};
    border: solid 1px ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.sm};
    overflow: hidden;
  }

  .toggle-replace-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    align-self: stretch;
    background: none;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.subtext1};
    padding: 0;
    border-radius: 3px;
  }

  .toggle-replace-btn:hover {
    background: ${(props) => rgba(props.theme.brand, 0.08)};
    color: ${(props) => props.theme.brand};
  }

  /* Column: search row stacked above replace row */
  .search-replace-rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .search-row,
  .replace-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Each input gets its own bordered box */
  .bruno-search-bar input {
    width: 180px;
    flex: 0 0 180px;
    background: transparent;
    color: ${(props) => props.theme.colors.text.subtext2};
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.sm};
    outline: none;
    padding: 2px 6px;
    font-size: ${(props) => props.theme.font.size.base};
    height: 26px;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  }

  .bruno-search-bar input:focus {
    border-color: ${(props) => props.theme.brand};
  }

  .searchbar-icon-btn {
    background: none;
    border: none;
    padding: 0 1px;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.subtext1};
    border-radius: 3px;
    height: 18px;
    width: 18px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .searchbar-icon-btn:hover {
    color: ${(props) => props.theme.text.base};
  }

  .searchbar-result-count {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.subtext1};
    white-space: nowrap;
    flex-shrink: 0;
    width: 68px;
    text-align: center;
  }

  .searchbar-icon-btn:focus,
  .searchbar-text-btn:focus {
    outline: 1px solid ${(props) => props.theme.codemirror.border};
  }

  .searchbar-icon-btn.active {
    color: ${(props) => props.theme.brand};
    background-color: ${(props) => rgba(props.theme.brand, 0.1)};
  }

  .cm-search-line-highlight {
    background: ${(props) => props.theme.codemirror.searchLineHighlightCurrent};
  }
`;

export default StyledWrapper;
