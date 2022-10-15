import styled from "styled-components";

const StyledWrapper = styled.div`
  margin-left: -1rem;
  margin-block: -1.5rem;
  .environments-sidebar {
    margin-bottom: 8px;
    background-color: #ffffff;
    min-height: 300px;
  }

  .environment-item {
    min-width: 150px;
    display: block;
    position: relative;
    cursor: pointer;
    padding: 8px 10px;
    color: rgb(35, 35, 35);
    border-bottom: 1px solid #eaecef;
    
    &:hover {
      text-decoration: none;
      background-color: #f6f8fa;
    }
  }

  .active {
    background-color: #e1e4e8;
    &:hover {
      text-decoration: none;
      background-color: #e1e4e8;
    }
  }

  .create-env {
    padding: 8px 10px;
    cursor: pointer;
    border-bottom: none;
    color: var(--color-text-link);
  }
`;

export default StyledWrapper;