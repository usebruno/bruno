import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin-inline: -1rem;
  margin-block: -1.5rem;
  background-color: ${(props) => props.theme.collection.environment.settings.bg};

  .generate-code-sidebar {
    background-color: ${(props) => props.theme.collection.environment.settings.sidebar.bg};
    border-right: solid 1px ${(props) => props.theme.collection.environment.settings.sidebar.borderRight};
    max-height: 80vh;
    height: 100%;
    overflow-y: auto;
  }

  .generate-code-item {
    min-width: 150px;
    display: block;
    position: relative;
    cursor: pointer;
    padding: 8px 10px;
    border-left: solid 2px transparent;
    text-decoration: none;

    &:hover {
      text-decoration: none;
      background-color: ${(props) => props.theme.collection.environment.settings.item.hoverBg};
    }
  }

  .active {
    background-color: ${(props) => props.theme.collection.environment.settings.item.active.bg} !important;
    border-left: solid 2px ${(props) => props.theme.collection.environment.settings.item.border};
    &:hover {
      background-color: ${(props) => props.theme.collection.environment.settings.item.active.hoverBg} !important;
    }
  }

  .flexible-container {
    width: 100%;
  }

  @media (max-width: 600px) {
    .flexible-container {
      width: 500px;
    }
  }

  @media (min-width: 601px) and (max-width: 1200px) {
    .flexible-container {
      width: 800px;
    }
  }

  @media (min-width: 1201px) {
    .flexible-container {
      width: 900px;
    }
  }
`;

export default StyledWrapper;
