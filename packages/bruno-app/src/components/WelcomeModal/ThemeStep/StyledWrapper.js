import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .theme-mode-buttons {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .theme-mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.md};
    border: 1.5px solid ${(props) => props.theme.border.border1};
    background: transparent;
    color: ${(props) => props.theme.colors.text.subtext1};
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.border.border2};
      color: ${(props) => props.theme.text};
    }

    &.active {
      border-color: ${(props) => props.theme.primary.solid};
      background: ${(props) => rgba(props.theme.primary.solid, 0.07)};
      color: ${(props) => props.theme.text};
    }
  }

  .theme-variants-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
    gap: 0.5rem;
  }

  .theme-variant-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.375rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: 1.5px solid ${(props) => props.theme.border.border0};
    background: transparent;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;

    &:hover {
      border-color: ${(props) => props.theme.border.border2};
    }

    &.selected {
      border-color: ${(props) => props.theme.primary.solid};
      background: ${(props) => rgba(props.theme.primary.solid, 0.06)};
    }

    .variant-name {
      font-size: 0.6875rem;
      color: ${(props) => props.theme.colors.text.subtext0};
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
  }

  .theme-preview-box {
    width: 52px;
    height: 34px;
    border-radius: 3px;
    display: flex;
    overflow: hidden;

    .preview-sidebar {
      width: 13px;
      height: 100%;
    }

    .preview-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 4px;
      gap: 3px;
    }

    .preview-line {
      height: 3px;
      border-radius: 2px;
    }
  }
`;

export default StyledWrapper;
