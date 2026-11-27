import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .modal-description {
    color: ${(props) => props.theme.text};
    margin-bottom: 0.75rem;

    strong {
      font-weight: 600;
    }
  }

  .item-info-card {
    background-color: ${(props) => props.theme.modal.title.bg};
    border-radius: ${(props) => props.theme.border.radius.sm};
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .item-name {
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 0.25rem;
  }

  .item-path {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    word-break: break-all;
  }

  .warning-text {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
    margin-bottom: 1rem;
  }

  .delete-confirmation {
    padding-top: 1rem;
    border-top: 1px solid ${(props) => props.theme.border.border0};

    label {
      display: block;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.text};
      margin-bottom: 0.5rem;
    }

    .delete-keyword {
      font-weight: 600;
      color: ${(props) => props.theme.colors.text.danger};
      font-family: monospace;
      background-color: ${(props) => rgba(props.theme.colors.text.danger, 0.1)};
      padding: 2px 0.375rem;
      border-radius: ${(props) => props.theme.border.radius.sm};
    }

    input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      font-size: ${(props) => props.theme.font.size.sm};
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: ${(props) => props.theme.border.radius.base};
      background-color: ${(props) => props.theme.input.bg};
      color: ${(props) => props.theme.text};
      outline: none;
      transition: border-color 0.15s ease;

      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
        opacity: 0.6;
      }

      &:focus {
        border-color: ${(props) => props.theme.colors.text.danger};
        box-shadow: 0 0 0 2px ${(props) => rgba(props.theme.colors.text.danger, 0.15)};
      }
    }
  }
`;

export default StyledWrapper;
