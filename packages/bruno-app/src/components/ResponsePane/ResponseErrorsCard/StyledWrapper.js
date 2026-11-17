import styled from 'styled-components';

const StyledWrapper = styled.div`
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: ${(props) => props.theme.background.base};
  border: 1px solid ${(props) => props.theme.border.subtle};
  border-radius: ${(props) => props.theme.border.radius.base};

  &.full-pane {
    flex-grow: 1;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    height: 2.375rem;
    padding: 0 0.5rem 0 0.75rem;
  }

  .card-title-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .card-title {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .card-actions {
    display: flex;
    gap: 0.125rem;
    flex-shrink: 0;
    margin-left: auto;
  }

  .card-body {
    min-height: 0;
    max-height: 10rem;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }

  &.full-pane .card-body {
    max-height: none;
  }
`;

export default StyledWrapper;
