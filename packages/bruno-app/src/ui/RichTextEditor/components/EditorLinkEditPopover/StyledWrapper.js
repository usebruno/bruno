import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.sm};
  color: ${(props) => props.theme.dropdown.color};
  background-color: ${(props) => props.theme.dropdown.bg};
  ${(props) =>
    props.theme.dropdown.shadow && props.theme.dropdown.shadow !== 'none'
      ? `box-shadow: ${props.theme.dropdown.shadow};`
      : 'box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);'}
  border-radius: ${(props) => props.theme.border.radius.base};
  border: 1px solid ${(props) => props.theme.dropdown.border || props.theme.border.border1};
  z-index: 9999;
  position: absolute;

  .editor-link-popover-content {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.75rem;
    width: 17rem;

    label {
      display: block;
      font-size: ${(props) => props.theme.font.size.xs};
      font-weight: 600;
      margin-bottom: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .popover-input {
      width: 100%;
      padding: 5px 8px;
      font-size: ${(props) => props.theme.font.size.sm};
      background: transparent;
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 6px;
      color: ${(props) => props.theme.text};
      transition: border-color 0.15s ease;
      outline: none;

      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
      }

      &:focus {
        border-color: ${(props) => props.theme.colors.accent};
      }
    }

    .popover-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
  }


`;

export default StyledWrapper;
