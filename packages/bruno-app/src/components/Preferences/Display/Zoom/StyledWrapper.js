import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .zoom-field {
    width: 120px;
    position: relative;
  }

  .zoom-field label {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    display: block;
  }

  .custom-select {
    width: 80px;
    height: 35.89px;
    padding: 0 0.5rem;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-color: ${(props) => props.theme.input.background};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.text};
    font-size: 0.875rem;
    line-height: 1.5;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .custom-select:hover {
    border-color: ${(props) => props.theme.input.hoverBorder || props.theme.input.border};
  }

  .custom-select .selected-value {
    flex: 1;
  }

  .custom-select .chevron-icon {
    color: ${(props) => props.theme.input.border};
    flex-shrink: 0;
    transition: transform 0.15s ease;
    margin-left: auto;
  }

  .dropdown-menu {
    width: 80px;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 0.25rem;
    background-color: ${(props) => props.theme.input.background};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 50;
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .dropdown-menu::-webkit-scrollbar {
    display: none;
  }

  .dropdown-option {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background-color 0.1s ease;
  }

  .dropdown-option:hover {
    background-color: ${(props) => props.theme.input.border};
  }

  .dropdown-option.selected {
    background-color: ${(props) => props.theme.input.focusBorder || props.theme.input.border}22;
  }

  .dropdown-option .option-label {
    flex: 1;
  }

  .dropdown-option .check-icon {
    color: ${(props) => props.theme.textLink};
    flex-shrink: 0;
  }

  .reset-btn {
    padding: 0.45rem 1rem;
    background: transparent;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.textLink};
    font-size: 0.875rem;
    line-height: 1.5;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
      background: ${(props) => props.theme.input.border};
    }

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
      box-shadow: 0 0 0 2px ${(props) => props.theme.input.focusBorder}33;
    }
  }
`;

export default StyledWrapper;
