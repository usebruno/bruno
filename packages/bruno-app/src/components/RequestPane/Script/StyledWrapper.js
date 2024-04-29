import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.section-wrapper {
    height: calc(100% - 26px);
  }

  div.script-section {
    height: calc((100% - 36px) / 2);
    min-height: 100px;
  }
  div.CodeMirror {
    height: 100%;
  }

  div.title {
    color: var(--color-tab-inactive);
  }
`;

export default StyledWrapper;
