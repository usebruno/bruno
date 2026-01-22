import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 2px;

  .tab-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 8px;
    background-color: ${(props) => props.theme.background.surface1};
    border-bottom: 1px solid ${(props) => props.groupColor || '#5B9BD5'};
    border-top: 2px solid ${(props) => props.groupColor || '#5B9BD5'};
    cursor: pointer;
    user-select: none;
    height: 24px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: ${(props) => props.theme.background.surface2};
    }
  }

  .tab-group-header-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .tab-group-line {
    width: 3px;
    height: 14px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .tab-group-name {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    color: ${(props) => props.theme.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tab-group-name-input {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    padding: 2px 6px;
    outline: none;
    width: 120px;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &:focus {
      border-color: ${(props) => props.groupColor || '#5B9BD5'};
    }
  }

  .tab-group-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .tab-group-header:hover .tab-group-actions {
    opacity: 1;
  }

  .tab-group-tabs {
    display: flex;
    flex-direction: row;
    padding-left: 8px;
    border-left: 3px solid ${(props) => props.groupColor || '#5B9BD5'};
    background-color: ${(props) => props.theme.background.surface0};
  }

  .color-picker-container {
    position: relative;
  }

  .color-picker-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: ${(props) => props.theme.dropdown.bg};
    border: 1px solid ${(props) => props.theme.dropdown.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 8px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    z-index: 1000;
    box-shadow: ${(props) => props.theme.shadow.md};
  }

  .color-option {
    width: 24px;
    height: 24px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 2px solid ${(props) => props.theme.border.border1};
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease;

    &:hover {
      transform: scale(1.1);
      border-color: ${(props) => props.theme.text};
    }

    &:active {
      transform: scale(0.95);
    }
  }
`;

export default StyledWrapper;
