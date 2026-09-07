import styled from 'styled-components';

const StyledWrapper = styled.div`
  .filter-dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    background: transparent;
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: ${(props) => props.theme.font.size.sm};

    &:hover {
      background: ${(props) => props.theme.background.surface0};
    }

    .filter-summary {
      font-weight: 500;
      min-width: 24px;
      text-align: center;
    }
  }
`;

export default StyledWrapper;

export const FilterMenu = styled.div`
  min-width: 200px;
  max-width: 250px;

  .filter-dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    background: ${(props) => props.theme.console.dropdownHeaderBg};
    border-bottom: 1px solid ${(props) => props.theme.console.border};
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.console.titleColor};
    position: sticky;
    top: 0;
  }

  .filter-toggle-all {
    background: transparent;
    border: none;
    color: ${(props) => props.theme.console.buttonColor};
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    padding: 2px 4px;
    border-radius: 2px;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.console.buttonHoverBg};
    }
  }

  .filter-dropdown-options {
    padding: 4px 0;
  }

  .filter-option {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.console.optionHoverBg};
    }

    input[type='checkbox'] {
      margin: 0 8px 0 0;
      width: 14px;
      height: 14px;
      accent-color: ${(props) => props.theme.console.checkboxColor};
    }
  }

  .filter-option-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .filter-option-label {
    color: ${(props) => props.theme.console.optionLabelColor};
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 400;
  }

  .filter-option-count {
    color: ${(props) => props.theme.console.optionCountColor};
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 400;
    margin-left: auto;
  }

  .log-icon {
    flex-shrink: 0;
    &.error { color: ${(props) => props.theme.status.danger.text}; }
    &.warn  { color: ${(props) => props.theme.status.warning.text}; }
    &.info  { color: ${(props) => props.theme.status.info.text}; }
    &.log   { color: ${(props) => props.theme.colors.text.muted}; }
  }
`;
