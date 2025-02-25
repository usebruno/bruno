import styled from 'styled-components';

const Wrapper = styled.div`
  max-height: 500px;
  overflow-y: auto;

  .scroll-shadow {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
  }

  table {
    width: 100%;
    table-layout: fixed;

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
      user-select: none;
    }
  }
`;

export default Wrapper;
