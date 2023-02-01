import styled from 'styled-components';

const Wrapper = styled.div`
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
`;

export default Wrapper;
