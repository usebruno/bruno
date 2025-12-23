import styled from 'styled-components';

const Wrapper = styled.div`
  .textbox {
    border: 1px solid #ccc;
    padding: 0.2rem 0.5rem;
    box-shadow: none;
    border-radius: 0px;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: 3px;
    background-color: ${(props) => props.theme.modal.input.bg};
    border: 1px solid ${(props) => props.theme.modal.input.border};
  }

  .item-path {
    .link {
      color: ${(props) => props.theme.textLink};
    }
  }
  .danger {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .test-summary {
    color: ${(props) => props.theme.tabs.active.border};
  }

  /* test results */
  .test-success {
    color: ${(props) => props.theme.colors.text.green};
  }

  .test-failure {
    color: ${(props) => props.theme.colors.text.danger};

    .error-message {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }
  
  .skipped-request {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .button-sm {
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .filter-button {
    &.active {
      color: ${(props) => props.theme.runnerResults.filterButton.active.text};
      border-bottom-color: ${(props) => props.theme.runnerResults.filterButton.active.border};
    }
    &:not(.active) {
      color: ${(props) => props.theme.runnerResults.filterButton.inactive.text};
    }
  }

  .filter-badge {
    background-color: ${(props) => props.theme.runnerResults.filterBadge.bg};
    border-color: ${(props) => props.theme.runnerResults.filterBadge.border};
    color: ${(props) => props.theme.runnerResults.filterBadge.text};
  }

  .section-border {
    border-color: ${(props) => props.theme.runnerResults.sectionBorder};
  }

  .filter-container {
    border-color: ${(props) => props.theme.runnerResults.filterContainer.border};
  }

  .filter-label-bg {
    background-color: ${(props) => props.theme.runnerResults.filterLabel.bg};
  }

  .filter-label-text {
    color: ${(props) => props.theme.runnerResults.filterLabel.text};
  }

  .action-button {
    border-color: ${(props) => props.theme.runnerResults.actionButton.border};
    color: ${(props) => props.theme.runnerResults.actionButton.text};
  }

  .icon-button {
    &:hover {
      background-color: ${(props) => props.theme.runnerResults.iconButton.hoverBg};
    }
  }

  .empty-state-text {
    color: ${(props) => props.theme.runnerResults.emptyState.text};
  }

  .empty-state-description {
    color: ${(props) => props.theme.runnerResults.emptyState.description};
  }
`;

export default Wrapper;
