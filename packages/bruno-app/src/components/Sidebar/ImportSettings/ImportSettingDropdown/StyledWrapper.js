import styled from 'styled-components';
import { darken } from 'polished';

const StyledWrapper = styled.div`
  .setting-dropdown-trigger {
    background-color: ${(props) => props.theme.background.surface1};
    border: 1px solid ${(props) => props.theme.background.surface2};
    border-radius: 4px;
    padding: 0.3rem 0.6rem;
    white-space: nowrap;

    svg {
      color: ${(props) => props.theme.colors.text.subtext0};
    }
  }

  .setting-dropdown-label {
    display: grid;

    > * {
      grid-area: 1 / 1;
    }
  }

  .setting-dropdown-label-sizer::after {
    content: attr(data-label);
    visibility: hidden;
  }

  .setting-dropdown-trigger:hover {
    background-color: ${(props) => darken(0.03, props.theme.background.surface1)};
    border-color: ${(props) => darken(0.03, props.theme.background.surface2)};
  }
`;

export default StyledWrapper;
