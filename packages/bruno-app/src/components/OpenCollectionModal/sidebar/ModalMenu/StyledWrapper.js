import styled from 'styled-components';

const StyledWrapper = styled.nav`
  width: 13.75rem;
  flex: none;
  display: flex;
  flex-direction: column;
  padding: 0.875rem 0.625rem;
  overflow-y: auto;
  background: ${(props) => props.theme.sidebar.bg};
  border-right: 0.0625rem solid ${(props) => props.theme.border.border1};

  h2 {
    margin: 0 0 0.875rem;
    padding: 0 0.625rem;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .menu-section {
    display: flex;
    flex-direction: column;
  }

  .menu-section-label {
    padding: 0.25rem 0.625rem 0.375rem;
    margin-top: 1rem;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    height: 1.875rem;
    flex: none;
    padding: 0 0.375rem 0 0.625rem;
    border: 0;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: none;
    font: inherit;
    font-size: ${(props) => props.theme.font.size.base};
    text-align: left;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.tabs.secondary.inactive.bg};
      color: ${(props) => props.theme.text};
    }

    &.active,
    &.active:hover {
      background: ${(props) => props.theme.tabs.secondary.active.bg};
      color: ${(props) => props.theme.tabs.secondary.active.color};
      font-weight: 500;
    }
  }

  .menu-item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export default StyledWrapper;
