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
    overflow-y: auto;
    overflow-x: hidden;

  }

  .search-index-status {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    padding: 2px 12px;
  }
`;

export default Wrapper;
