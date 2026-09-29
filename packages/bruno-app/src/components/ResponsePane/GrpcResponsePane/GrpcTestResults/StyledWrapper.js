import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .test-summary {
    transition: background-color 0.2s;
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

  .error-message {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .message-group-label {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 0.75rem;
    padding-top: 0.5rem;
  }

  .dropdown-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};
  }
`;

export default StyledWrapper;
