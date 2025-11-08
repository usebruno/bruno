import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  padding: 0.25rem;
    
  .environment-list-divider {
      border-right: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
  }

  .environment-item {
    min-width: 150px;
    display: block;
    position: relative;
    cursor: pointer;
    padding: 8px 10px;
    border-bottom: solid 2px transparent;
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
    border-bottom: solid 2px ${(props) => props.theme.collection.environment.settings.item.border};
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
