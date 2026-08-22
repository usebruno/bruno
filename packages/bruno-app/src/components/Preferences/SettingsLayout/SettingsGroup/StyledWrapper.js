import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: 1rem;
  border-top: 1px solid ${(props) => props.theme.border.border1};

  &:first-child {
    padding-top: 0;
    border-top: none;
  }

  .settings-group-title {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin: 0;
  }

  .settings-group-description {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0.25rem 0 0 0;
  }

  .settings-group-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .settings-group-body:first-child {
    margin-top: 0;
  }
`;

export default StyledWrapper;
