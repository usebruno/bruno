import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.8125rem;

  .dropdown {
    width: 100%;
  }

  .method-selector {
    border-radius: 3px;
    min-width: 90px;

    .tippy-box {
      max-width: 150px !important;
      min-width: 110px !important;
    }

    .dropdown-item {
      padding: 0.25rem 0.6rem !important;
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }
`;

export default Wrapper;
