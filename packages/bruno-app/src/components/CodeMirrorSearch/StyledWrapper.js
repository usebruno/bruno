import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .bruno-search-bar {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 20;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0;
    padding: 1px 3px;
    width: auto;
    max-width: 320px;
    min-height: 22px;
    background: ${(props) => props.theme.background.base};
    color: ${(props) => props.theme.text.base};
    border: solid 1px ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  .bruno-search-bar input {
    min-width: 80px;
    background: transparent;
    color: inherit;
    border: none;
    outline: none;
    padding: 1px 2px;
    font-size: ${(props) => props.theme.font.size.base};
    margin: 0 1px;
    height: 28px;
  }

  .searchbar-icon-btn {
    background: none;
    border: none;
    padding: 0 1px;
    margin: 0 1px;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.subtext1};
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
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.subtext1};
    margin: 0 8px 0 1px; 
    white-space: nowrap;
  }

  .bruno-search-bar input {
    background: transparent;
    color: ${(props) => props.theme.colors.text.subtext2};
    border: none;
    outline: none;
    font-size: ${(props) => props.theme.font.size.base};
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
    color: ${(props) => props.theme.brand};
    background-color: ${(props) => rgba(props.theme.brand, 0.1)};
    font-weght: 500;
  }
`;

export default StyledWrapper;
