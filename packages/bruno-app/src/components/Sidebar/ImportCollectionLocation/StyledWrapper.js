import styled from 'styled-components';
import { darken, rgba } from 'polished';

const Wrapper = styled.div`
  .current-group {
    background-color: ${(props) => props.theme.background.surface1};
    border-radius: 4px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    border: 1px solid ${(props) => props.theme.background.surface2};
  }

  .current-group:hover {
    background-color: ${(props) => darken(0.03, props.theme.background.surface1)};
    border-color: ${(props) => darken(0.03, props.theme.background.surface2)};

  /* Fix dropdown positioning */
  [data-tippy-root] {
    left: 0 !important;
  }
`;

export default Wrapper;
