import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 12.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  border: 0.0625rem dashed ${(props) => props.theme.border.border2};
  border-radius: ${(props) => props.theme.border.radius.base};
  background: ${(props) => props.theme.background.mantle};
  color: ${(props) => props.theme.text};
  text-align: center;
  transition: border-color 0.12s ease, background-color 0.12s ease;

  &.is-drag-over {
    border-color: ${(props) => props.theme.status.info.text};
    background: ${(props) => props.theme.status.info.background};
  }

  .drop-zone-icon {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .drop-zone-title {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
  }

  .drop-zone-text {
    font-size: 0.78125rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .drop-zone-hint {
    margin-top: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  code {
    font-family: var(--font-family-mono);
    font-size: 0.71875rem;
  }
`;

export default StyledWrapper;
