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

    .config-card {
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: ${(props) => props.theme.border.radius.md};
      overflow: hidden;

      .version-info {
        padding: 0.75rem 1rem;
        background-color: ${(props) => props.theme.background.mantle};

        .version-line {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.text};
        }

        .version-label {
          font-weight: 500;
        }

        .version-summary {
          margin: 0.25rem 0 0;
          font-size: ${(props) => props.theme.font.size.xs};
          color: ${(props) => props.theme.colors.text.muted};
        }
      }

      .card-divider {
        height: 1px;
        background-color: ${(props) => props.theme.border.border1};
      }

      .env-section {
        padding: 1rem;

        .env-section-title {
          margin: 0 0 0.75rem;
          font-size: ${(props) => props.theme.font.size.xs};
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: ${(props) => props.theme.colors.text.muted};
        }

        .env-list {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .env-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          margin: 0;

          .env-checkbox {
            width: 1rem;
            height: 1rem;
            margin: 0;
            flex-shrink: 0;
            cursor: pointer;
          }

          .env-name {
            font-size: ${(props) => props.theme.font.size.sm};
            color: ${(props) => props.theme.text};
            min-width: 0;
          }
        }

        .env-empty {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.muted};
        }
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
