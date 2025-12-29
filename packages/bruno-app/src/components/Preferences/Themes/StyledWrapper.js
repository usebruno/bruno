import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  padding: 8px 0;
        
  .theme-mode-option {
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    box-shadow: none;
    padding: 6px 8px;
    width: auto;

    &.selected {
      border: 1px solid ${(props) => props.theme.accents.primary};
      background: ${(props) => rgba(props.theme.accents.primary, 0.07)};
      cursor: default;
    }

    &:hover {
      border: 1px solid ${(props) => props.theme.accents.primary};
    }
  }

  .theme-variant-label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 12px;
  }

  .theme-variants {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .theme-variant-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 16px;
    border: 2px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.md};
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 165px;

    &:hover {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &.selected {
      border-color: ${(props) => props.theme.accents.primary};
      background: ${(props) => rgba(props.theme.accents.primary, 0.07)};
      cursor: default;
    }
  }

  .theme-preview {
    width: 60px;
    height: 40px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    margin-bottom: 8px;
    display: flex;
    overflow: hidden;
  }

  .theme-preview-sidebar {
    width: 15px;
    height: 100%;
  }

  .theme-preview-main {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 4px;
    gap: 3px;
  }

  .theme-preview-line {
    height: 4px;
    border-radius: 2px;
    width: 80%;
  }

  .theme-variant-name {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
  }

  .section-divider {
    height: 1px;
    background: ${(props) => props.theme.input.border};
    margin: 15px 0;
  }
`;

export default StyledWrapper;
