import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};
  background-color: ${(props) => props.theme.bg};

  &[data-background-image-active] {
    position: relative;
    isolation: isolate;

    .bruno-background-layer {
      position: absolute;
      inset: 0;
      z-index: -1;
      overflow: hidden;
      pointer-events: none;
    }

    .bruno-background-image {
      position: absolute;
      background-position: center;
      background-repeat: no-repeat;
    }

    .app-titlebar,
    .status-bar,
    aside.sidebar {
      background-color: color-mix(
        in srgb, ${(props) => props.theme.sidebar.bg}, transparent var(--bruno-background-transparency)
      );
    }

    .bruno-workspace-surface {
      background-color: color-mix(
        in srgb, ${(props) => props.theme.bg}, transparent var(--bruno-background-transparency)
      );
    }

    .request-pane .CodeMirror,
    .response-pane .CodeMirror {
      background-color: transparent;
    }
  }
`;

export default StyledWrapper;
