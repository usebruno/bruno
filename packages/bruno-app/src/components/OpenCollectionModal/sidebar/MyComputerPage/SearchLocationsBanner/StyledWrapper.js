import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 0 1.25rem 0.625rem;
  padding: 0.75rem 0.875rem;
  border-radius: ${(props) => props.theme.border.radius.md};
  background: ${(props) => props.theme.status.info.background};

  > svg {
    flex: none;
    margin-top: 0.0625rem;
    color: ${(props) => props.theme.status.info.text};
  }

  .banner-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .banner-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .banner-sub {
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .banner-end {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: -0.1875rem;
  }

  .banner-action {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
  }
`;

export default StyledWrapper;
