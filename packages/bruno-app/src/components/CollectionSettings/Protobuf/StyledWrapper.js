import styled from 'styled-components';

const StyledWrapper = styled.div`
  .available-certificates {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};

    button.remove-certificate {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }
`;

export default StyledWrapper;
