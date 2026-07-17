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
      border: 1px solid ${(props) => props.theme.table.border};
      border-radius: ${(props) => props.theme.border.radius.md};
      overflow: hidden;
      width: 100%;

      .version-info {
        padding: 0.75rem;
        background-color: ${(props) => props.theme.background.mantle};

        .version-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .collection-name {
          font-weight: 500;
          font-size: ${(props) => props.theme.font.size.base};
          color: ${(props) => props.theme.text};
          min-width: 0;
        }

        .version-value {
          font-weight: 400;
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.subtext2};
          white-space: nowrap;
        }

        .version-value.unset {
          font-style: italic;
        }

        .version-summary {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin: 0.25rem 0 0;
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.subtext2};
        }

        .version-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: ${(props) => props.theme.colors.text.subtext0};
          flex-shrink: 0;
        }
      }

      .card-divider {
        height: 1px;
        background-color: ${(props) => props.theme.table.border};
      }

      .env-section {
        padding: 0.75rem;

        .env-checkbox {
          width: 1rem;
          height: 1rem;
          margin: 0;
          flex-shrink: 0;
          cursor: pointer;
          accent-color: ${(props) => props.theme.primary.solid};
        }

        .env-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.15rem;
        }

        .env-section-heading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }

        .env-section-count {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.colors.text.subtext2};
          white-space: nowrap;
        }

        .env-section-title {
          margin: 0;
          font-size: ${(props) => props.theme.font.size.sm};
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: ${(props) => props.theme.colors.text.subtext2};
        }

        .env-select-all {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin: 0;
          cursor: pointer;
          user-select: none;

          .env-select-all-label {
            font-size: ${(props) => props.theme.font.size.sm};
            color: ${(props) => props.theme.colors.text.subtext2};
            white-space: nowrap;
          }
        }

        .env-row {
          display: flex;
          align-items: center;
          height: 28px;
          cursor: pointer;
          margin: 0;

          .env-checkbox {
            margin-right: 10px;
          }

          .env-name {
            font-size: ${(props) => props.theme.font.size.base};
            color: ${(props) => props.theme.text};
            min-width: 0;
            margin-left: 6px;
          }
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
