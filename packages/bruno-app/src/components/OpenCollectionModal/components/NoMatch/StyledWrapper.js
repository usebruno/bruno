import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.75rem 1.5rem;
  text-align: center;

  .no-match-title {
    margin: 0;
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .no-match-text {
    max-width: 25rem;
    margin: 0;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
