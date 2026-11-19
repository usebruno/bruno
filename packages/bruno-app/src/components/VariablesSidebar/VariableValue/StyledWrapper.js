import styled from 'styled-components';
import codemirrorTokenStyles from 'components/CodeEditor/tokenStyles';
import { OBJECT_CELL_MAX_HEIGHT } from '../constants';

const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`;

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  min-width: 0;

  &.is-object {
    align-items: flex-start;
    height: auto;
  }

  .value-content {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    height: 100%;
  }

  &.is-object .value-content {
    align-items: stretch;
    height: auto;
  }

  .value-editor {
    width: 100%;
    min-width: 0;

    .CodeMirror {
      font-family: ${MONO} !important;
      font-size: 12px;
      background: transparent;
    }

    .CodeMirror pre {
      font-family: ${MONO} !important;
    }

    &.is-multiline {
      max-height: ${OBJECT_CELL_MAX_HEIGHT};

      > div {
        max-height: ${OBJECT_CELL_MAX_HEIGHT};
        min-height: 0;
      }
    }
  }

  .row-actions {
    display: flex;
    align-items: flex-start;
    flex-shrink: 0;
    gap: 2px;
    padding-top: 8px;
    height: 33px;
  }

  .row-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    margin: 0;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    border-radius: 4px;
    line-height: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;

    &.is-pinned,
    &:focus-visible {
      opacity: 1;
      pointer-events: auto;
    }

    &:hover,
    &:focus-visible {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.sidebar.bg};
    }

    &.copied {
      color: ${(props) => props.theme.colors.text.green};
    }
  }

  ${codemirrorTokenStyles}
`;

export default StyledWrapper;
