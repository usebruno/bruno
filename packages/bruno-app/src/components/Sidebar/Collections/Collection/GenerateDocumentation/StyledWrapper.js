import styled from 'styled-components';

const StyledWrapper = styled.div`
  .content {
    .title {
      font-size: ${(props) => props.theme.font.size.base};
      color: ${(props) => props.theme.text};
    }

    .description {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      line-height: 1.6;
    }

    .preview-container {
      border-radius: ${(props) => props.theme.border.radius.md};
      overflow: hidden;
      border: 1px solid ${(props) => props.theme.border.border1};

      .preview-label {
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.125rem 0.5rem;
        font-size: ${(props) => props.theme.font.size.xs};
        font-weight: 500;
        color: #3b82f6;
        background-color: rgba(59, 130, 246, 0.1);
        border: 1px dashed rgba(59, 130, 246, 0.4);
        border-radius: ${(props) => props.theme.border.radius.sm};
      }

      .preview-image {
        width: 100%;
        height: auto;
        display: block;
      }
    }

    .features {
      li {
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.text};
      }

      .check-icon {
        color: ${(props) => props.theme.colors.text.green};
      }
    }

    .note {
      font-size: ${(props) => props.theme.font.size.xs};
      color: ${(props) => props.theme.colors.text.muted};
      line-height: 1.5;
    }
  }

  .text-warning {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.warning};
  }
`;

export default StyledWrapper;
