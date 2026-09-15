import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-groups {
    max-width: 30rem;
  }

  .settings-group {
    padding: 0.75rem 0;
  }

  .settings-group + .settings-group {
    border-top: 1px solid ${(props) => props.theme.input.border};
  }

  .settings-group-title {
    padding: 0 0.75rem;
    margin-bottom: 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .settings-row {
    padding: 0.5rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.md};

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }
  }

  .settings-row-title {
    margin-bottom: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
