import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.8125rem;

  .body-mode-selector {
    background: #efefef;
    border-radius: 3px;

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
      padding-left: 1.5rem !important;
    }

    .label-item {
      padding: 0.2rem 0.6rem !important;
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
  }
`;

export default Wrapper;
