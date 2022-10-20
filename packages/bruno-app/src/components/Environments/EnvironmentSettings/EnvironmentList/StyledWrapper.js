import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin-inline: -1rem;
  margin-block: -1.5rem;

  .environments-sidebar {
    background-color: #eaeaea;
    min-height: 400px;
  }

  .environment-item {
    min-width: 150px;
    display: block;
    position: relative;
    cursor: pointer;
    padding: 8px 10px;
    border-left: solid 2px transparent;
    text-decoration: none;

    &:hover {
      text-decoration: none;
      background-color: #e4e4e4;
    }
  }

  .active {
    background-color: #dcdcdc !important;
    border-left: solid 2px var(--color-brand);
    &:hover {
      background-color: #dcdcdc !important;
    }
  }

  .btn-create-environment {
    padding: 8px 10px;
    cursor: pointer;
    border-bottom: none;
    color: var(--color-text-link);

    &:hover {
      span {
        text-decoration: underline;
      }
    }
  }
`;

export default StyledWrapper;
