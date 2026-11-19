import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;

  color: ${(props) => props.theme.text};

  .beta-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    line-height: 1.5;
    background: ${(props) => props.theme.status.info.background};
    color: ${(props) => props.theme.status.info.text};
  }
`;

export default StyledWrapper;
