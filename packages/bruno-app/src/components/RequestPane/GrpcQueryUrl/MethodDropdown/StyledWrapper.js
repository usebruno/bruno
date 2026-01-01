import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .method-dropdown-container {
    display: flex;
    align-items: center;
    height: 100%;
    margin-right: 0.5rem;
  }

  .method-dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.5rem;
    cursor: pointer;
    user-select: none;
  }

  .method-dropdown-trigger-icon {
    margin-right: 0.5rem;
  }

  .method-dropdown-trigger-text {
    font-size: ${(props) => props.theme.font.size.xs};
    white-space: nowrap;
    color: ${(props) => props.theme.dropdown.color};
  }

  .method-dropdown-caret {
    margin-left: 0.25rem;
    color: ${(props) => props.theme.colors.text.muted};
    fill: ${(props) => props.theme.colors.text.muted};
  }

  .method-dropdown-list {
    max-height: 24rem;
    overflow-y: auto;
    width: 24rem;
    min-width: 15rem;
  }

  input#search-input {
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.text};

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .method-dropdown-service-group {
    margin-bottom: 0.5rem;
  }

  .method-dropdown-service-header {
    padding: 0.25rem 0.75rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: ${(props) => props.theme.dropdown.separator};
    color: ${(props) => props.theme.dropdown.color};
  }

  .method-dropdown-method-item {
    padding: 0.5rem 0.75rem;
    width: 100%;
    border-left-width: 2px;
    border-left-style: solid;
    border-left-color: transparent;
    transition: all 200ms;
    position: relative;
    cursor: pointer;

    &:hover {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }

    &--selected {
      border-left-color: ${(props) => props.theme.dropdown.selectedColor};
      background-color: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.2)};
    }

    &--focused {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }
  }

  .method-dropdown-method-content {
    display: flex;
    align-items: center;
  }

  .method-dropdown-method-icon {
    font-size: ${(props) => props.theme.font.size.xs};
    margin-right: 0.75rem;
    color: ${(props) => props.theme.dropdown.iconColor};
  }

  .method-dropdown-method-details {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .method-dropdown-method-name {
    font-weight: 500;
    color: ${(props) => props.theme.dropdown.color};
  }

  .method-dropdown-method-type {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.mutedText};
  }

  .method-dropdown-empty-state {
    padding: 0.5rem 0.75rem;
    width: 100%;
    transition: all 200ms;
    position: relative;
  }

  .method-dropdown-empty-state-text {
    display: flex;
    align-items: center;
    font-size: ${(props) => props.theme.font.size.xs};
    margin-right: 0.75rem;
    color: ${(props) => props.theme.dropdown.mutedText};
  }
`;

export default StyledWrapper;
