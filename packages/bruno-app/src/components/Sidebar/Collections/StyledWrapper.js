import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding-top: 4px;

  .collections-list {
    min-height: 0;
    padding: 0 4px;
    padding-top: 4px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.scrollbar.color};
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: ${(props) => props.theme.scrollbar.color};
    }
  }
`;

export default Wrapper;
