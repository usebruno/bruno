import styled from 'styled-components';

const Wrapper = styled.div`
  ul {
    width: 100%;
    padding: 0;
    margin: 0 0 10px;
    padding-left: 1rem;
    border-bottom: 1px solid #cfcfcf;

    li {
      display: inline-block;
      width: 150px;
      border: 1px solid transparent;
      border-bottom: none;
      bottom: -1px;
      position: relative;
      list-style: none;
      padding: 6px 12px;
      cursor: pointer;

      &.active {
        border-color: #cfcfcf;
        background: #fff;
        border-radius: 5px 5px 0 0;
      }

      .tab-label {
        overflow: hidden;
      }

      .tab-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;      }

      .close-icon-container {
        min-height: 20px;

        .close-icon {
          color: #9f9f9f;
          width: 8px;
        }

        &:hover .close-icon{
          color: rgb(142, 68, 173);
        }
      }
    }
  }
`;

export default Wrapper;
