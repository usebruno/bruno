import styled from 'styled-components';

export const ModalTitle = styled.div`
  color: ${(props) => props.theme.colors.text.subtext2};
  font-weight: 600;
  font-size: ${(props) => props.theme.font.size.base};
  line-height: 18px;
`;

const StyledWrapper = styled.div`
  width: 100%;
  .subheader {
    margin-bottom: 0.5rem;
    color: ${(props) => props.theme.colors.text.muted};
    font-weight: 400;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 18px;

    .collection-name {
      color: ${(props) => props.theme.text};
      font-weight: 600;
    }
  }

  .version-card {
    width: 100%;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    overflow: hidden;

    .version-row {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
    }

    .version-col {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .col-label {
      color: ${(props) => props.theme.text};
      font-weight: 500;
      font-size: ${(props) => props.theme.font.size.base};
      line-height: 20px;
    }

    .current-value {
      color: ${(props) => props.theme.text};
      font-weight: 400;
      font-size: ${(props) => props.theme.font.size.sm};
      line-height: 20px;

      .unset {
        font-family: inherit;
        font-style: italic;
      }
    }

    .arrow {
      align-self: center;
      color: ${(props) => props.theme.colors.text.muted};
      flex-shrink: 0;
    }

    .input-wrap {
      position: relative;

      .textbox {
        padding-right: 2.25rem;
        color: ${(props) => props.theme.text};
        font-weight: 400;
        font-size: ${(props) => props.theme.font.size.sm};
        line-height: 20px;
      }

      .copy-btn {
        position: absolute;
        top: 50%;
        right: 0.5rem;
        transform: translateY(-50%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem;
        background: transparent;
        border: none;
        cursor: pointer;
        color: ${(props) => props.theme.colors.text.muted};

        &:hover:not(:disabled) {
          color: ${(props) => props.theme.text};
        }

        &:disabled {
          opacity: 0.5;
          cursor: default;
        }
      }
    }
  }

  .preview {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.625rem 1rem;
    border-top: 1px solid ${(props) => props.theme.border.border1};
    background-color: ${(props) => props.theme.background.mantle};
    color: ${(props) => props.theme.text};
    font-weight: 400;
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 20px;

    strong {
      font-weight: 700;
    }

    .old {
      color: ${(props) => props.theme.colors.text.danger};
      font-weight: 700;
      word-break: break-all;
    }

    .new {
      font-family: monospace;
      color: ${(props) => props.theme.colors.text.green};
      font-weight: 700;
      word-break: break-all;
    }

    .preview-arrow {
      color: ${(props) => props.theme.colors.text.muted};
      flex-shrink: 0;
    }
  }
`;

export default StyledWrapper;
