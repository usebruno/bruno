import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-header-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .settings-header-description {
    margin: 0.25rem 0 0;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
