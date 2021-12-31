import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 600;

    thead, td {
      border: 1px solid #efefef;
    }

    thead {
      color: #777777;
      font-size: 0.75rem;
    }
    td {
      padding: 6px 10px;
    }
  }

  .btn-add-header {
    margin-block: 10px;
    padding: 5px;
  }

  input[type="text"] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;

    &:focus{
      outline: none !important;
      border: solid 1px transparent;
    }
  }
`;

export default Wrapper;
