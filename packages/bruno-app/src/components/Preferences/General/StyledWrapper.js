import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  
  color: ${(props) => props.theme.text};

  .text-link {
    color: ${(props) => props.theme.colors.text.link};
    text-decoration: none;
    font-size: 0.8125rem;

    &:hover {
      text-decoration: underline;
    }
  }

  form.bruno-form {
    label {
      font-size: 0.8125rem;
    }
  }

  .default-location-input {
    max-width: 28rem;
  }

  .language-selector {
    position: relative;
    width: 10rem;
  }

  .language-selector-trigger {
    width: 100%;
    height: 35.89px;
    padding: 0 0.75rem;
    cursor: pointer;
    background-color: ${(props) => props.theme.input.bg || props.theme.dropdown.bg};
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

    &:hover {
      border-color: ${(props) => props.theme.input.hoverBorder || props.theme.input.border};
    }
  }

  .language-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 0.25rem;
    background-color: ${(props) => props.theme.dropdown.bg};
    border: 1px solid ${(props) => props.theme.dropdown.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    box-shadow: ${(props) => props.theme.dropdown.shadow || '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'};
    z-index: 50;
    overflow: hidden;
  }

  .language-option {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background-color 0.1s ease;
    color: ${(props) => props.theme.dropdown.color};

    &:hover {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.selected {
      font-weight: 600;
      background-color: ${(props) => props.theme.dropdown.hoverBg};
      color: ${(props) => props.theme.dropdown.selectedColor};
    }
  }
`;

export default StyledWrapper;
