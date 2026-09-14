import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${(props) => props.theme.status.danger.text};
  background-color: ${(props) => props.theme.status.danger.background};
  border-radius: ${(props) => props.theme.border.radius.base};
  padding: 0.375rem 0.5rem;
  margin: 0 20px 8px;
  font-size: ${(props) => props.theme.font.size.sm};

  .warning-icon {
    flex-shrink: 0;
  }

  .missing-name {
    font-weight: 600;
    word-break: break-all;
  }
`;

export default StyledWrapper;
