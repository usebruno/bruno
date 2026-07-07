import styled from 'styled-components';
import { hexToRgba } from 'utils/color';

const Wrapper = styled.div`
  height: 2.1rem;

  .url-input-group {
    border: ${(props) =>
      props.$envColor
        ? `1px solid ${hexToRgba(props.$envColor, 0.28)}`
        : props.theme.requestTabPanel.url.border};
    background: ${(props) =>
      props.$envColor
        ? hexToRgba(props.$envColor, 0.20)
        : 'transparent'};
    border-radius: ${(props) => props.theme.border.radius.base};
    flex: 1;
    min-width: 0;
  }

  .infotip {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }

  .infotip:hover .infotiptext {
    visibility: visible;
    opacity: 1;
  }

  .infotiptext {
    visibility: hidden;
    width: auto;
    background-color: ${(props) => props.theme.background.surface2};
    color: ${(props) => props.theme.text};
    text-align: center;
    border-radius: 4px;
    padding: 4px 8px;
    position: absolute;
    z-index: 1;
    bottom: 34px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.3s;
    white-space: nowrap;
  }

  .infotiptext::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -4px;
    border-width: 4px;
    border-style: solid;
    border-color: ${(props) => props.theme.background.surface2} transparent transparent transparent;
  }

  .shortcut {
    font-size: 0.625rem;
  }

  /* 环境名 Tag 样式 */
  .env-tags {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    flex-shrink: 0;
    border-left: 1px solid ${(props) => props.theme.app.collection.toolbar.environmentSelector.separator || 'rgba(255,255,255,0.10)'};
    margin-left: 4px;
  }

  .env-tag {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .env-tag--no-env {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 10px;
    background: rgba(166, 173, 200, 0.10);
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    flex-shrink: 0;
  }
`;

export default Wrapper;
