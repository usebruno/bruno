import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .test-summary {
    transition: background-color 0.2s;
    border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
    color: ${(props) => props.theme.text};

    &:hover {
      background-color: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  .test-success {
    color: ${(props) => props.theme.colors.text.green};
  }

  .test-failure {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .test-success-count {
    color: ${(props) => props.theme.colors.text.green};
  }

  .test-failure-count {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .error-message {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .test-results-list {
    transition: all 0.3s ease;
  }

  .dropdown-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};
  }
`;

export default StyledWrapper;
