import styled from 'styled-components';

const Wrapper = styled.div`
  .folder-list {
    border: 1px solid #ccc;
    border-radius: 5px;

    .folder-name {
      padding-block: 8px;
      padding-inline: 12px;
      cursor: pointer;
      &:hover {
        background-color: #e8e8e8;
      }
    }
`;

export default Wrapper;
