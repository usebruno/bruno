import styled from 'styled-components';

const Wrapper = styled.div`
  .heading {
    display: inline-flex;
    font-weight: 600;
    margin-top: 1.5rem;
    padding: 6px 0px;
    border-bottom: 2px solid !important;
  }

  .collection-list {
    min-width: 500px;

    .collection-list-item {
      padding: 4px 0px;
      border-radius: 3px;

      &:hover {
        background-color: #f4f4f4;
        margin-left: -8px;
        margin-right: -8px;
        padding-left: 8px;
        padding-right: 8px;
      }
    }
  }
`;

export default Wrapper;
