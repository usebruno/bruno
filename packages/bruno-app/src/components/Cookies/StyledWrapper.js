import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 300;
    table-layout: fixed;

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
      user-select: none;
    }
    td {
      padding: 6px 10px;

      &:nth-child(1) {
        width: 30%;
      }

      &:nth-child(3) {
        width: 70px;
      }
    }
  }
`;

export default Wrapper;
