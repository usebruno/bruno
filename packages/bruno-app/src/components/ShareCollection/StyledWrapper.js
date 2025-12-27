import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .tabs {
    .tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      color: ${(props) => props.theme.colors.text.subtext0};
      cursor: pointer;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &.active {
        font-weight: ${(props) => props.theme.tabs.active.fontWeight} !important;
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }
    }
  }
  
  .share-button {
    display: flex;
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 10px;
    border: 1px solid ${(props) => props.theme.border.border0};
    background-color: ${(props) => props.theme.background.base};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: all 0.1s ease;

    &.no-padding {
      padding: 0px;
    }

    .note-warning {
      color: ${(props) => props.theme.colors.text.warning};
      background-color: ${(props) => rgba(props.theme.colors.text.warning, 0.06)};
    }

    &:hover {
      background-color: ${(props) => props.theme.background.mantle};
      border-color: ${(props) => props.theme.border.border2};
    }
  }
`;

export default StyledWrapper;
