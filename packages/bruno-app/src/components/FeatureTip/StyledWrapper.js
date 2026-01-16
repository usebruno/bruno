import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  display: inline-block;

  .feature-tip-popover {
    position: absolute;
    z-index: 1000;
    width: 280px;
    background-color: ${(props) => props.theme.sidebar.badge.bg};
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    animation: fadeIn 0.2s ease-out;
  }

  &.placement-bottom .feature-tip-popover {
    top: calc(100% + 10px);
    right: 0;
  }

  &.placement-bottom-start .feature-tip-popover {
    top: calc(100% + 10px);
    left: 0;
  }

  &.placement-top .feature-tip-popover {
    bottom: calc(100% + 10px);
    right: 0;
  }

  &.placement-left .feature-tip-popover {
    right: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
  }

  &.placement-right .feature-tip-popover {
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
  }

  .tip-arrow {
    position: absolute;
    width: 12px;
    height: 12px;
    background-color: ${(props) => props.theme.sidebar.badge.bg};
    transform: rotate(45deg);
  }

  &.placement-bottom .tip-arrow {
    top: -6px;
    right: 16px;
  }

  &.placement-bottom-start .tip-arrow {
    top: -6px;
    left: 16px;
  }

  &.placement-top .tip-arrow {
    bottom: -6px;
    right: 16px;
  }

  &.placement-left .tip-arrow {
    right: -6px;
    top: 50%;
    margin-top: -6px;
  }

  &.placement-right .tip-arrow {
    left: -6px;
    top: 50%;
    margin-top: -6px;
  }

  .tip-content {
    position: relative;
    padding: 12px;
  }

  .tip-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .tip-icon {
    color: #f59e0b;
    flex-shrink: 0;
  }

  .tip-title {
    font-weight: 600;
    font-size: 13px;
    color: ${(props) => props.theme.text};
    flex: 1;
  }

  .tip-close {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: ${(props) => props.theme.text};
    opacity: 0.6;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    
    &:hover {
      opacity: 1;
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .tip-description {
    font-size: 12px;
    color: ${(props) => props.theme.text};
    opacity: 0.85;
    line-height: 1.5;
    margin: 0 0 12px 0;
  }

  .tip-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    align-items: center;
  }

  .tip-learn-more {
    font-size: 12px;
    color: #3b82f6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }

  .tip-dismiss-btn {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    
    &:hover {
      background-color: #2563eb;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &.placement-left, &.placement-right {
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  }
`;

export default StyledWrapper;
