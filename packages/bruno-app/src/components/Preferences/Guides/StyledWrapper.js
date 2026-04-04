import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  max-width: 600px;

  .guides-header {
    margin-bottom: 24px;

    h3 {
      font-size: ${(props) => props.theme.font?.size?.lg || '16px'};
      font-weight: 600;
      color: ${(props) => props.theme.text};
      margin: 0 0 6px 0;
    }

    p {
      font-size: ${(props) => props.theme.font?.size?.sm || '12px'};
      color: ${(props) => props.theme.colors?.text?.muted || '#999'};
      margin: 0;
      line-height: 1.5;
    }
  }

  .guides-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .guide-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: ${(props) => props.theme.background?.surface0 || 'rgba(255,255,255,0.02)'};
    border: 1px solid ${(props) => props.theme.border?.border1 || '#333'};
    border-radius: ${(props) => props.theme.border?.radius?.md || '8px'};
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.border?.border2 || '#444'};
      background: ${(props) => props.theme.background?.surface1 || 'rgba(255,255,255,0.04)'};
    }

    .guide-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: ${(props) => props.theme.border?.radius?.md || '8px'};
      background: ${(props) => props.theme.primary?.solid || '#D9A342'}1A;
      color: ${(props) => props.theme.primary?.solid || '#D9A342'};
      flex-shrink: 0;
    }

    .guide-content {
      flex: 1;
      min-width: 0;

      .guide-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;

        h4 {
          font-size: ${(props) => props.theme.font?.size?.md || '14px'};
          font-weight: 600;
          color: ${(props) => props.theme.text};
          margin: 0;
        }

        .guide-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          font-size: ${(props) => props.theme.font?.size?.xs || '11px'};
          font-weight: 500;
          border-radius: ${(props) => props.theme.border?.radius?.sm || '4px'};

          &.completed {
            background: ${(props) => props.theme.status?.success?.background || 'rgba(76, 175, 80, 0.15)'};
            color: ${(props) => props.theme.status?.success?.text || '#4CAF50'};
          }

          &.new {
            background: ${(props) => props.theme.primary?.solid || '#D9A342'}1A;
            color: ${(props) => props.theme.primary?.solid || '#D9A342'};
          }
        }
      }

      .guide-description {
        font-size: ${(props) => props.theme.font?.size?.sm || '12px'};
        color: ${(props) => props.theme.colors?.text?.muted || '#999'};
        margin: 0 0 8px 0;
        line-height: 1.4;
      }

      .guide-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: ${(props) => props.theme.font?.size?.xs || '11px'};
        color: ${(props) => props.theme.colors?.text?.subtext0 || '#666'};

        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }

    .guide-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;

      button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: ${(props) => props.theme.border?.radius?.sm || '4px'};
        font-size: ${(props) => props.theme.font?.size?.sm || '12px'};
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: none;
        white-space: nowrap;

        &.btn-primary {
          background: ${(props) => props.theme.primary?.solid || '#D9A342'};
          color: ${(props) => props.theme.mode === 'dark' ? '#000' : '#fff'};

          &:hover {
            filter: brightness(1.1);
          }
        }

        &.btn-secondary {
          background: transparent;
          color: ${(props) => props.theme.colors?.text?.muted || '#999'};
          border: 1px solid ${(props) => props.theme.border?.border1 || '#333'};

          &:hover {
            background: ${(props) => props.theme.dropdown?.hoverBg || 'rgba(255,255,255,0.1)'};
            color: ${(props) => props.theme.text};
            border-color: ${(props) => props.theme.border?.border2 || '#444'};
          }
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        svg {
          width: 14px;
          height: 14px;
        }
      }
    }
  }
`;

export default StyledWrapper;
