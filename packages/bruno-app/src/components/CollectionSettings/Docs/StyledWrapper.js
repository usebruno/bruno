import styled from 'styled-components';

const StyledWrapper = styled.div`
  .docs-card {
    background-color: ${(props) => props.theme.bg};
    border: 1px solid ${(props) => {
      const themeBorder = props.theme.table?.border || props.theme.requestTabPanel?.cardTable?.border || props.theme.requestTabPanel?.card?.border;
      // Use a more visible border color in light mode
      const isLightMode = props.theme.bg === '#fff' || props.theme.bg === 'white' || props.theme.mode === 'light';
      if (themeBorder && themeBorder !== '#efefef') return themeBorder;
      return isLightMode ? '#d1d5db' : '#efefef';
    }};
    border-radius: 8px;
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  .docs-separator {
    border-top: 1px solid ${(props) => {
      const themeBorder = props.theme.table?.border || props.theme.requestTabPanel?.cardTable?.border;
      // Use a more visible separator color in light mode
      const isLightMode = props.theme.bg === '#fff' || props.theme.bg === 'white' || props.theme.mode === 'light';
      if (themeBorder && themeBorder !== '#efefef') return themeBorder;
      return isLightMode ? '#d1d5db' : '#efefef';
    }};
    margin: 16px 0;
    flex-shrink: 0;
  }

  .editing-mode {
    cursor: pointer;
  }

  .expand-docs-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: transparent;
    border: 1px solid ${(props) => props.theme.table?.border || props.theme.requestTabPanel?.cardTable?.border || props.theme.modal?.input?.border || '#ccc'};
    border-radius: 6px;
    color: ${(props) => props.theme.text || '#343434'};
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s ease;
    height: fit-content;
    line-height: 1.5;

    &:hover {
      background-color: ${(props) => props.theme.dropdown?.hoverBg || props.theme.plainGrid?.hoverBg || 'rgba(0, 0, 0, 0.05)'};
      border-color: ${(props) => props.theme.input?.focusBorder || props.theme.table?.border || '#8b8b8b'};
    }

    &:focus {
      outline: none;
      box-shadow: none;
    }

    svg {
      color: ${(props) => props.theme.text || '#343434'};
      stroke-width: 1.5;
    }

    span {
      color: ${(props) => props.theme.text || '#343434'};
    }
  }

  .edit-docs-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: transparent;
    border: 1px solid ${(props) => props.theme.table?.border || props.theme.requestTabPanel?.cardTable?.border || props.theme.modal?.input?.border || '#ccc'};
    border-radius: 6px;
    color: ${(props) => props.theme.text || '#343434'};
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s ease;
    height: fit-content;
    line-height: 1.5;

    &:hover {
      background-color: ${(props) => props.theme.dropdown?.hoverBg || props.theme.plainGrid?.hoverBg || 'rgba(0, 0, 0, 0.05)'};
      border-color: ${(props) => props.theme.input?.focusBorder || props.theme.table?.border || '#8b8b8b'};
    }

    &:focus {
      outline: none;
      box-shadow: none;
    }

    svg {
      color: ${(props) => props.theme.text || '#343434'};
      stroke-width: 1.5;
    }

    span {
      color: ${(props) => props.theme.text || '#343434'};
    }
  }

  .cancel-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: transparent;
    border: 1px solid ${(props) => props.theme.modal?.input?.border || props.theme.requestTabs?.bottomBorder || props.theme.table?.border || '#ccc'};
    border-radius: 6px;
    color: ${(props) => props.theme.text || '#343434'};
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s ease;
    height: fit-content;
    line-height: 1.5;

    &:hover {
      background-color: ${(props) => props.theme.dropdown?.hoverBg || props.theme.plainGrid?.hoverBg || 'rgba(0, 0, 0, 0.05)'};
      border-color: ${(props) => props.theme.modal?.input?.focusBorder || props.theme.input?.focusBorder || '#8b8b8b'};
    }

    &:focus {
      outline: none;
      box-shadow: none;
    }

    svg {
      color: ${(props) => props.theme.text || '#343434'};
      stroke-width: 1.5;
    }

    span {
      color: ${(props) => props.theme.text || '#343434'};
    }
  }

  .save-button {
    display: flex;
    align-items: center;
    padding: 6px 16px;
    background-color: ${(props) => props.theme.tabs?.active?.border || '#D97706'};
    border: 1px solid ${(props) => props.theme.tabs?.active?.border || '#D97706'};
    border-radius: 6px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 1;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }

    &:focus {
      outline: none;
      box-shadow: none;
    }
  }
`;

export default StyledWrapper;
