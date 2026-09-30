import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 40rem;

  color: ${(props) => props.theme.text};

  .support-group {
    display: flex;
    flex-direction: column;
  }

  .support-group-label {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0 0 0.5rem 0;
  }

  .support-card {
    display: flex;
    flex-direction: column;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    overflow: hidden;
  }

  .support-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    color: ${(props) => props.theme.text};
    text-decoration: none;
    transition: background-color 0.12s ease;

    &:hover {
      background-color: ${(props) => props.theme.background.mantle};
      text-decoration: none;
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.input.focusBorder};
      outline-offset: -2px;
    }

    &:hover .support-link-affordance {
      color: ${(props) => props.theme.text};
    }
  }

  .support-link + .support-link {
    border-top: 1px solid ${(props) => props.theme.border.border1};
  }

  .support-link-tile {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: ${(props) => props.theme.border.radius.md};
    background-color: ${(props) => props.theme.background.surface0};
    color: ${(props) => props.theme.colors.text.muted};
    transition: background-color 0.12s ease, color 0.12s ease;
  }

  .support-link:hover .support-link-tile {
    background-color: ${(props) => props.theme.background.surface1};
  }

  .support-link-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1 1 auto;
  }

  .support-link-label {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
  }

  .support-link-description {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin-top: 0.125rem;
  }

  .support-link-affordance {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
    transition: color 0.12s ease;
  }
`;

export default StyledWrapper;
