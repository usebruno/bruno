import styled from 'styled-components';

const StyledWrapper = styled.div`
  .section-title {
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .password-toggle {
    color: ${(props) => props.theme.colors.text.muted};

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
