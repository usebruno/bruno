import styled, { keyframes, css } from 'styled-components';

const pulseRing = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const StyledWrapper = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  pointer-events: none;
  animation: ${fadeIn} 0.2s ease-out;

  /* Click catcher for the dark overlay area - sits behind spotlight */
  .onboarding-click-catcher {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }

  .onboarding-spotlight {
    position: absolute;
    background: transparent;
    pointer-events: none;
    z-index: 1;
    transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: ${(props) => props.$spotlightBorderRadius ?? props.theme.border?.radius?.md ?? '8px'};

    /* This creates the dark overlay with a transparent hole */
    box-shadow:
      0 0 0 9999px rgba(0, 0, 0, 0.45),
      inset 0 0 0 2px ${(props) => props.theme.primary?.solid || '#D9A342'};

    ${(props) => props.$pulse && css`
      &::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: inherit;
        border: 2px solid ${(props) => props.theme.primary?.solid || '#D9A342'};
        animation: ${pulseRing} 1.5s ease-in-out infinite;
      }
    `}

  }

  .onboarding-tooltip {
    position: absolute;
    width: 320px;
    max-width: calc(100vw - 40px);
    z-index: 2;
    background: ${(props) => props.theme.modal?.body?.bg || props.theme.bg};
    border: 1px solid ${(props) => props.theme.border?.border1 || '#333'};
    border-radius: ${(props) => props.theme.border?.radius?.lg || '10px'};
    box-shadow: ${(props) => props.theme.shadow?.lg || '0 4px 20px rgba(0, 0, 0, 0.3)'};
    pointer-events: auto;
    animation: ${slideIn} 0.25s ease-out;
    overflow: hidden;

    .tooltip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid ${(props) => props.theme.border?.border0 || '#2a2a2a'};

      .tooltip-title {
        font-size: ${(props) => props.theme.font?.size?.md || '14px'};
        font-weight: 600;
        color: ${(props) => props.theme.text};
        margin: 0;
      }

      .tooltip-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: ${(props) => props.theme.colors?.text?.muted || '#999'};
        cursor: pointer;
        border-radius: ${(props) => props.theme.border?.radius?.sm || '4px'};
        transition: all 0.15s ease;

        &:hover {
          background: ${(props) => props.theme.dropdown?.hoverBg || 'rgba(255,255,255,0.1)'};
          color: ${(props) => props.theme.text};
        }
      }
    }

    .tooltip-content {
      padding: 12px 16px 16px;
      color: ${(props) => props.theme.colors?.text?.subtext1 || '#aaa'};
      font-size: ${(props) => props.theme.font?.size?.base || '13px'};
      line-height: 1.6;
    }

    .tooltip-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: ${(props) => props.theme.background?.surface0 || 'rgba(255,255,255,0.02)'};
      border-top: 1px solid ${(props) => props.theme.border?.border0 || '#2a2a2a'};

      .tooltip-progress {
        display: flex;
        align-items: center;
        gap: 8px;

        .progress-text {
          font-size: ${(props) => props.theme.font?.size?.sm || '12px'};
          color: ${(props) => props.theme.colors?.text?.muted || '#999'};
        }

        .progress-dots {
          display: flex;
          gap: 4px;

          .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${(props) => props.theme.border?.border2 || '#444'};
            transition: all 0.2s ease;

            &.active {
              background: ${(props) => props.theme.primary?.solid || '#D9A342'};
            }

            &.completed {
              background: ${(props) => props.theme.primary?.subtle || '#c49332'};
            }
          }
        }
      }

      .tooltip-actions {
        display: flex;
        align-items: center;
        gap: 8px;

        .action-hint {
          font-size: ${(props) => props.theme.font?.size?.sm || '12px'};
          color: ${(props) => props.theme.primary?.solid || '#D9A342'};
          font-style: italic;
        }

        button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 14px;
          border-radius: ${(props) => props.theme.border?.radius?.sm || '4px'};
          font-size: ${(props) => props.theme.font?.size?.sm || '12px'};
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;

          &.btn-primary {
            background: ${(props) => props.theme.primary?.solid || '#D9A342'};
            color: ${(props) => props.theme.mode === 'dark' ? '#000' : '#fff'};

            &:hover {
              filter: brightness(1.1);
            }
          }

          svg {
            width: 14px;
            height: 14px;
          }
        }
      }
    }
  }

  /* Tooltip arrow/pointer */
  .tooltip-arrow {
    position: absolute;
    width: 12px;
    height: 12px;
    background: ${(props) => props.theme.modal?.body?.bg || props.theme.bg};
    border: 1px solid ${(props) => props.theme.border?.border1 || '#333'};
    transform: rotate(45deg);

    &.arrow-top {
      bottom: -7px;
      left: 50%;
      margin-left: -6px;
      border-top: none;
      border-left: none;
    }

    &.arrow-bottom {
      top: -7px;
      left: 50%;
      margin-left: -6px;
      border-bottom: none;
      border-right: none;
    }

    &.arrow-left {
      right: -7px;
      top: 50%;
      margin-top: -6px;
      border-bottom: none;
      border-left: none;
    }

    &.arrow-right {
      left: -7px;
      top: 50%;
      margin-top: -6px;
      border-top: none;
      border-right: none;
    }
  }
`;

export default StyledWrapper;
