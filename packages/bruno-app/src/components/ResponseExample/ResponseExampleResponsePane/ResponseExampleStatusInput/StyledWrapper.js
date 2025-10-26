import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  display: inline-block;

  .response-status-input {
    background: ${(props) => props.theme.requestTabPanel.url.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 3px;
    padding: 0.35rem 0.6rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${(props) => props.theme.text.primary};
    min-width: 120px;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.colors.primary};
      box-shadow: 0 0 0 2px ${(props) => props.theme.colors.primary}20;
    }

    &::placeholder {
      color: ${(props) => props.theme.text.muted};
    }

    &.text-ok {
      color: ${(props) => props.theme.colors.success};
    }

    &.text-warning {
      color: ${(props) => props.theme.colors.warning};
    }

    &.text-error {
      color: ${(props) => props.theme.colors.error};
    }
  }

  .status-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: ${(props) => props.theme.dropdown.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-top: none;
    border-radius: 0 0 3px 3px;
    box-shadow: ${(props) => props.theme.dropdown.shadow};
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
    overflow-x: hidden;

    .suggestion-item {
      display: flex;
      align-items: center;
      padding: 0.35rem 0.6rem;
      margin: 0;
      cursor: pointer;
      transition: background-color 0.15s ease;
      font-size: 0.8125rem;
      color: ${(props) => props.theme.dropdown.primaryText};
      width: 100%;
      box-sizing: border-box;

              &:hover:not(:disabled) {
                background-color: ${(props) => props.theme.dropdown.hoverBg};
              }

      .status {
        font-weight: 600;
        color: inherit;
        margin-right: 0.5rem;
        min-width: 40px;
        flex-shrink: 0;
      }
    }
  }
`;

export default StyledWrapper;
