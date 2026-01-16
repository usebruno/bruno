import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .modal-description {
    color: ${(props) => props.theme.text};
    margin-bottom: 12px;

    strong {
      font-weight: 600;
    }
  }

  .collection-info-card {
    background-color: ${(props) => props.theme.modal.title.bg};
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .collection-name {
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 4px;
  }

  .collection-path {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    word-break: break-all;
  }

  .warning-text {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
    margin-bottom: 16px;
  }

  .delete-confirmation {
    padding-top: 16px;
    border-top: 1px solid ${(props) => props.theme.border.border0};

    label {
      display: block;
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.text};
      margin-bottom: 8px;
    }

    .delete-keyword {
      font-weight: 600;
      color: ${(props) => props.theme.colors.text.danger};
      font-family: monospace;
      background-color: ${(props) => rgba(props.theme.colors.text.danger, 0.1)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    input {
      width: 100%;
      padding: 8px 12px;
      font-size: ${(props) => props.theme.font.size.sm};
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: 6px;
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
