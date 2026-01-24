import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
  position: relative;

  @keyframes expandTabs {
    from {
      opacity: 0;
      max-height: 0;
      transform: scaleY(0.8);
      transform-origin: top;
    }
    to {
      opacity: 1;
      max-height: 500px;
      transform: scaleY(1);
    }
  }

  .tab-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: linear-gradient(
      135deg,
      ${(props) => props.theme.background.surface1} 0%,
      ${(props) => props.theme.background.surface2} 100%
    );
    border-left: 4px solid ${(props) => props.groupColor || '#3B82F6'};
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    user-select: none;
    height: 32px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 6px 6px 0 0;
      background: ${(props) => props.groupColor || '#3B82F6'};
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);

      &::before {
        opacity: 0.05;
      }
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
  }

  .tab-group-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;

    svg {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .tab-group-line {
    width: 4px;
    height: 18px;
    border-radius: 3px;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tab-group-header:hover .tab-group-line {
    height: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }

  .tab-group-name {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 700;
    color: ${(props) => props.theme.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    transition: color 0.2s ease;
    position: relative;
    z-index: 1;
  }

  .tab-group-header:hover .tab-group-name {
    color: ${(props) => props.groupColor || '#3B82F6'};
  }

  .tab-group-name-input {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 700;
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    border: 2px solid ${(props) => props.theme.input.border};
    border-radius: 6px;
    padding: 4px 8px;
    outline: none;
    width: 120px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 1;

    &:focus {
      border-color: ${(props) => props.groupColor || '#3B82F6'};
      box-shadow: 0 0 0 3px ${(props) => props.groupColor || '#3B82F6'}20;
      transform: scale(1.02);
    }
  }

  .tab-group-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 10;
  }

  .tab-group-header:hover .tab-group-actions {
    opacity: 1;
  }

  .tab-group-tabs {
    display: flex;
    flex-direction: row;
    padding-left: 12px;
    border-left: 4px solid ${(props) => props.groupColor || '#3B82F6'};
    background: linear-gradient(
      to right,
      ${(props) => props.groupColor || '#3B82F6'}08,
      ${(props) => props.theme.background.surface0} 20px
    );
    border-radius: 0 0 6px 6px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .tab-group-tabs-enter {
    max-height: 0;
    opacity: 0;
  }

  .tab-group-tabs-enter-active {
    max-height: 500px;
    opacity: 1;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tab-group-tabs-exit {
    max-height: 500px;
    opacity: 1;
  }

  .tab-group-tabs-exit-active {
    max-height: 0;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .color-picker-container {
    position: relative;
  }
`;

export default StyledWrapper;
