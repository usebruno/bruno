import styled from 'styled-components';

const StyledWrapper = styled.div`
  .data-file-details {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .data-file-error {
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default StyledWrapper;
