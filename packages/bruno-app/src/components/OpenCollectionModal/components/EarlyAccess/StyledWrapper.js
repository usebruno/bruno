import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.25rem 1.25rem 1.25rem;
  overflow-y: auto;

  .early-access {
    flex: 1;
    min-height: 16.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    color: ${(props) => props.theme.text};
    text-align: center;
  }

  .early-access-icon {
    display: inline-flex;
    margin-bottom: 0.75rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .early-access-title {
    margin: 0 0 0.25rem;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .early-access-subtitle {
    margin-bottom: 1.125rem;
    font-size: 0.78125rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .early-access-points {
    width: 100%;
    max-width: 25rem;
    margin: 0 0 1.25rem;
    padding: 0;
    border: 0.0625rem solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    font-size: 0.78125rem;
    line-height: 1.125rem;
    color: ${(props) => props.theme.colors.text.muted};
    list-style: none;
    text-align: left;

    li {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.5625rem 0.875rem;
      white-space: nowrap;

      & + li {
        border-top: 0.0625rem solid ${(props) => props.theme.border.border1};
      }
    }

    svg {
      flex: none;
      margin-top: 0.125rem;
      color: ${(props) => props.theme.status.info.text};
    }
  }
`;

export default StyledWrapper;
