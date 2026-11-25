import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 0 1.25rem 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: ${(props) => props.theme.border.radius.md};
  background: ${(props) => props.theme.status.info.background};

  > svg {
    flex: none;
    align-self: flex-start;
    margin-top: 0.125rem;
    color: ${(props) => props.theme.status.info.text};
  }

  .banner-text {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .banner-action {
    flex: none;
    align-self: flex-end;
    margin-top: 1.375rem;
  }

  .banner-dismiss {
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
  }
`;

export default StyledWrapper;
