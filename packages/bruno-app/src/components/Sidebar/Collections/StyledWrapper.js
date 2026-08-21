import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;

  .collections-list {
    flex: 1 1 0%;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: 4px;
    /* Virtuoso owns the scroll container; keep this a bounded, non-scrolling flex box. */
    overflow: hidden;
  }
`;

export default Wrapper;
