import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin-inline: -1rem;
  margin-block: -1.5rem;

  background-color: ${(props) => props.theme.collection.environment.settings.bg};

  .environments-sidebar {
    background-color: ${(props) => props.theme.collection.environment.settings.sidebar.bg};
    border-right: solid 1px ${(props) => props.theme.collection.environment.settings.sidebar.borderRight};
    min-height: 400px;
    height: 100%;
    max-height: 85vh;
    overflow-y: auto;
  }

  .environment-item {
    min-width: 150px;
    display: block;
    position: relative;
    cursor: pointer;
    padding: 8px 10px;
    border-left: solid 2px transparent;
    text-decoration: none;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

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

  .btn-create-environment,
  .btn-import-environment {
    padding: 8px 10px;
    cursor: pointer;
    border-bottom: none;
    color: ${(props) => props.theme.textLink};

    span:hover {
      text-decoration: underline;
    }
  }

  .btn-import-environment {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
