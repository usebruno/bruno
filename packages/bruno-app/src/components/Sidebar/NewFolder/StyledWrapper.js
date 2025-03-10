import styled from 'styled-components';

const Wrapper = styled.div`
  .highlight {
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .path-display {
    background: ${(props) => props.theme.requestTabPanel.url.bg};
    border-radius: 4px;
    padding: 8px 12px;

    .filename {
      color: ${(props) => props.theme.brand};
      font-weight: 500;
    }
  }
`;

export default Wrapper;
