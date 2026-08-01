import styled from 'styled-components';

const Wrapper = styled.div`
  height: 2.1rem;

  .url-input-group {
    border: ${(props) => props.theme.requestTabPanel.url.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    flex: 1;
    min-width: 0;
  }

`;

export default Wrapper;
